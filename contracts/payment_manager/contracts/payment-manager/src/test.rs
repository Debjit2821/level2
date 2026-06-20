#![cfg(test)]

use crate::{InvoiceStatus, PaymentManager, PaymentManagerClient};
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use soroban_sdk::token;

#[test]
fn test_create_and_pay_direct_invoice() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentManager, ());
    let client = PaymentManagerClient::new(&env, &contract_id);

    let payee = Address::generate(&env);
    let payer = Address::generate(&env);

    // Register a mock token (Stellar Asset Contract)
    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = sac.address();
    
    let token = token::Client::new(&env, &token_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    // Mint some tokens to payer
    let mint_amount = 1000i128;
    token_admin_client.mint(&payer, &mint_amount);
    assert_eq!(token.balance(&payer), mint_amount);

    let invoice_amount = 500i128;
    let title = String::from_str(&env, "Consulting Fee");
    let desc = String::from_str(&env, "10 hours of backend coding");

    // 1. Create Invoice (direct)
    let id = client.create_invoice(
        &payee,
        &payer,
        &invoice_amount,
        &token_id,
        &title,
        &desc,
        &false, // is_escrow = false
    );

    assert_eq!(id, 1);
    assert_eq!(client.get_total_invoices(), 1);

    let invoice = client.get_invoice(&1).unwrap();
    assert_eq!(invoice.payee, payee);
    assert_eq!(invoice.payer, payer);
    assert_eq!(invoice.amount, invoice_amount);
    assert_eq!(invoice.status, InvoiceStatus::Pending);
    assert_eq!(invoice.is_escrow, false);

    // 2. Pay Invoice (direct)
    client.pay_invoice(&1, &payer);

    // Verify token transfer (funds go directly to payee)
    assert_eq!(token.balance(&payer), mint_amount - invoice_amount);
    assert_eq!(token.balance(&payee), invoice_amount);

    let updated_invoice = client.get_invoice(&1).unwrap();
    assert_eq!(updated_invoice.status, InvoiceStatus::Released); // direct payment settles immediately
}

#[test]
fn test_escrow_payment_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentManager, ());
    let client = PaymentManagerClient::new(&env, &contract_id);

    let payee = Address::generate(&env);
    let payer = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = sac.address();
    
    let token = token::Client::new(&env, &token_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    // Mint tokens to payer
    let mint_amount = 2000i128;
    token_admin_client.mint(&payer, &mint_amount);

    let invoice_amount = 1500i128;
    let title = String::from_str(&env, "Web Design Escrow");
    let desc = String::from_str(&env, "Figma design and UI coding");

    // 1. Create Escrow Invoice
    let id = client.create_invoice(
        &payee,
        &payer,
        &invoice_amount,
        &token_id,
        &title,
        &desc,
        &true, // is_escrow = true
    );

    assert_eq!(id, 1);

    // 2. Pay Invoice (funds held in contract)
    client.pay_invoice(&1, &payer);

    // Verify tokens transferred to contract, not payee yet
    assert_eq!(token.balance(&payer), mint_amount - invoice_amount);
    assert_eq!(token.balance(&payee), 0);
    assert_eq!(token.balance(&contract_id), invoice_amount);

    let invoice_paid = client.get_invoice(&1).unwrap();
    assert_eq!(invoice_paid.status, InvoiceStatus::Paid);

    // 3. Release Escrow
    client.release_escrow(&1, &payer);

    // Verify tokens transferred from contract to payee
    assert_eq!(token.balance(&contract_id), 0);
    assert_eq!(token.balance(&payee), invoice_amount);

    let invoice_released = client.get_invoice(&1).unwrap();
    assert_eq!(invoice_released.status, InvoiceStatus::Released);
}

#[test]
fn test_escrow_refund_flow() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentManager, ());
    let client = PaymentManagerClient::new(&env, &contract_id);

    let payee = Address::generate(&env);
    let payer = Address::generate(&env);

    let token_admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_id = sac.address();
    
    let token = token::Client::new(&env, &token_id);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_id);

    // Mint tokens to payer
    let mint_amount = 2000i128;
    token_admin_client.mint(&payer, &mint_amount);

    let invoice_amount = 1200i128;
    let title = String::from_str(&env, "Software Service");
    let desc = String::from_str(&env, "Escrow backup payment");

    // 1. Create and Pay
    client.create_invoice(&payee, &payer, &invoice_amount, &token_id, &title, &desc, &true);
    client.pay_invoice(&1, &payer);

    assert_eq!(token.balance(&contract_id), invoice_amount);

    // 2. Refund Escrow (executed by payee)
    client.refund_escrow(&1, &payee);

    // Verify tokens transferred back to payer
    assert_eq!(token.balance(&contract_id), 0);
    assert_eq!(token.balance(&payer), mint_amount); // balance restored
    assert_eq!(token.balance(&payee), 0);

    let invoice_refunded = client.get_invoice(&1).unwrap();
    assert_eq!(invoice_refunded.status, InvoiceStatus::Refunded);
}

#[test]
fn test_cancel_invoice() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(PaymentManager, ());
    let client = PaymentManagerClient::new(&env, &contract_id);

    let payee = Address::generate(&env);
    let payer = Address::generate(&env);
    let token_id = Address::generate(&env);

    let title = String::from_str(&env, "To Cancel");
    let desc = String::from_str(&env, "This invoice will be cancelled");

    client.create_invoice(&payee, &payer, &100, &token_id, &title, &desc, &false);

    // Cancel by payee
    client.cancel_invoice(&1, &payee);

    let invoice = client.get_invoice(&1).unwrap();
    assert_eq!(invoice.status, InvoiceStatus::Cancelled);
}
