#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec};

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum InvoiceStatus {
    Pending = 0,
    Paid = 1,
    Released = 2,
    Refunded = 3,
    Cancelled = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub id: u64,
    pub payee: Address,
    pub payer: Address,      // Set to a specific address, or a dummy contract address for "open" invoices
    pub amount: i128,
    pub token: Address,
    pub status: InvoiceStatus,
    pub is_escrow: bool,
    pub title: String,
    pub description: String,
    pub created_at: u64,
}

#[contracttype]
pub enum DataKey {
    Invoice(u64),
    InvoiceCount,
}

#[contract]
pub struct PaymentManager;

#[contractimpl]
impl PaymentManager {
    /// Creates a new invoice. Returns the newly created invoice ID.
    pub fn create_invoice(
        env: Env,
        payee: Address,
        payer: Address,
        amount: i128,
        token: Address,
        title: String,
        description: String,
        is_escrow: bool,
    ) -> u64 {
        payee.require_auth();
        assert!(amount > 0, "Amount must be positive");

        let mut count: u64 = env.storage().persistent().get(&DataKey::InvoiceCount).unwrap_or(0);
        count += 1;

        let invoice = Invoice {
            id: count,
            payee: payee.clone(),
            payer: payer.clone(),
            amount,
            token,
            status: InvoiceStatus::Pending,
            is_escrow,
            title,
            description,
            created_at: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&DataKey::Invoice(count), &invoice);
        env.storage().persistent().set(&DataKey::InvoiceCount, &count);

        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "invoice_created"), count, payee, payer),
            amount,
        );

        count
    }

    /// Pays an existing invoice.
    pub fn pay_invoice(env: Env, invoice_id: u64, payer: Address) {
        payer.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(
            invoice.status == InvoiceStatus::Pending,
            "Invoice is not in pending state"
        );

        // If the invoice was initialized with a specific payer, verify it.
        // Otherwise (open invoice), bind the paying address as the payer.
        if invoice.payer != payer && invoice.payer != env.current_contract_address() {
            // Check if the invoice payer was set to contract address as a placeholder for "any"
            panic!("Payer does not match invoice requirements");
        } else if invoice.payer == env.current_contract_address() {
            invoice.payer = payer.clone();
        }

        let token_client = soroban_sdk::token::Client::new(&env, &invoice.token);

        if invoice.is_escrow {
            // Transfer funds to this contract (escrow hold)
            token_client.transfer(&payer, &env.current_contract_address(), &invoice.amount);
            invoice.status = InvoiceStatus::Paid;
        } else {
            // Direct transfer to payee
            token_client.transfer(&payer, &invoice.payee, &invoice.amount);
            invoice.status = InvoiceStatus::Released; // Directly settled and released
        }

        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "invoice_paid"), invoice_id, payer),
            invoice.amount,
        );
    }

    /// Releases escrowed funds to the payee. Allowed only by the payer.
    pub fn release_escrow(env: Env, invoice_id: u64, caller: Address) {
        caller.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(invoice.is_escrow, "Invoice is not escrow-backed");
        assert!(
            invoice.status == InvoiceStatus::Paid,
            "Escrow can only be released after payment"
        );
        assert!(
            caller == invoice.payer,
            "Only the payer can release the escrowed funds"
        );

        let token_client = soroban_sdk::token::Client::new(&env, &invoice.token);
        
        // Transfer from contract to payee
        token_client.transfer(&env.current_contract_address(), &invoice.payee, &invoice.amount);

        invoice.status = InvoiceStatus::Released;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "escrow_released"), invoice_id, invoice.payee),
            invoice.amount,
        );
    }

    /// Refunds escrowed funds to the payer. Allowed only by the payee (vendor).
    pub fn refund_escrow(env: Env, invoice_id: u64, caller: Address) {
        caller.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(invoice.is_escrow, "Invoice is not escrow-backed");
        assert!(
            invoice.status == InvoiceStatus::Paid,
            "Escrow can only be refunded after payment"
        );
        assert!(
            caller == invoice.payee,
            "Only the payee can refund the escrowed funds"
        );

        let token_client = soroban_sdk::token::Client::new(&env, &invoice.token);
        
        // Transfer back to payer
        token_client.transfer(&env.current_contract_address(), &invoice.payer, &invoice.amount);

        invoice.status = InvoiceStatus::Refunded;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "escrow_refunded"), invoice_id, invoice.payer),
            invoice.amount,
        );
    }

    /// Cancels an unpaid invoice. Allowed only by the payee.
    pub fn cancel_invoice(env: Env, invoice_id: u64, caller: Address) {
        caller.require_auth();

        let mut invoice: Invoice = env
            .storage()
            .persistent()
            .get(&DataKey::Invoice(invoice_id))
            .expect("Invoice not found");

        assert!(
            invoice.status == InvoiceStatus::Pending,
            "Only pending invoices can be cancelled"
        );
        assert!(
            caller == invoice.payee,
            "Only the payee can cancel the invoice"
        );

        invoice.status = InvoiceStatus::Cancelled;
        env.storage().persistent().set(&DataKey::Invoice(invoice_id), &invoice);

        // Emit Event
        env.events().publish(
            (Symbol::new(&env, "invoice_cancelled"), invoice_id, caller),
            invoice.amount,
        );
    }

    /// Queries an invoice by ID.
    pub fn get_invoice(env: Env, invoice_id: u64) -> Option<Invoice> {
        env.storage().persistent().get(&DataKey::Invoice(invoice_id))
    }

    /// Returns the total count of invoices created.
    pub fn get_total_invoices(env: Env) -> u64 {
        env.storage().persistent().get(&DataKey::InvoiceCount).unwrap_or(0)
    }

    /// Helper to fetch multiple invoices in range.
    pub fn get_invoices(env: Env, from_id: u64, to_id: u64) -> Vec<Invoice> {
        let mut list = Vec::new(&env);
        let count = Self::get_total_invoices(env.clone());
        let start = if from_id == 0 { 1 } else { from_id };
        let end = if to_id > count { count } else { to_id };

        for i in start..=end {
            if let Some(invoice) = Self::get_invoice(env.clone(), i) {
                list.push_back(invoice);
            }
        }
        list
    }
}

#[cfg(test)]
mod test;

