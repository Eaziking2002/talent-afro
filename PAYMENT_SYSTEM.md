# Flutterwave Payment System

This document explains how the escrow payment system works with Flutterwave integration.

## Overview

The system implements:
- ✅ **Escrow payments** - Funds are held until work is completed
- ✅ **Commission tracking** - 10% platform fee on all transactions
- ✅ **Secure payouts** - Talents can withdraw to their bank accounts
- ✅ **Transaction history** - Full transparency on money flow

## Commission Structure

- **Platform Fee**: 10% of transaction amount
- **Net Amount**: 90% goes to talent after job completion
- All amounts tracked in database with full transparency

## How It Works

### 1. Payment Initialization (`payment-initialize`)
Employer initiates payment for a job:
- Creates Flutterwave payment link
- Calculates 10% platform fee
- Creates escrow transaction record
- Returns payment link for employer to complete

**Usage:**
```typescript
const response = await supabase.functions.invoke('payment-initialize', {
  body: {
    jobId: 'uuid',
    amount: 10000, // in minor units (e.g., 100.00 USD)
    currency: 'USD',
    description: 'Job payment'
  }
});
```

### 2. Payment Webhook (`payment-webhook`)
Flutterwave notifies when payment is completed:
- Verifies payment completion
- Updates transaction status
- Marks job as in_progress
- Funds held in escrow

**Note:** This endpoint is public (no JWT) as it receives webhooks from Flutterwave.

### 3. Escrow Release (`escrow-release`)
Employer releases funds after work completion:
- Verifies employer authorization
- Creates release transaction
- Updates talent's wallet balance
- Marks application and job as completed

**Usage:**
```typescript
const response = await supabase.functions.invoke('escrow-release', {
  body: {
    jobId: 'uuid',
    applicationId: 'uuid'
  }
});
```

### 4. Payout Withdrawal (`payout-withdraw`)
Talent withdraws funds to bank account:
- Checks wallet balance
- Initiates Flutterwave transfer
- Creates payout transaction
- Updates wallet balance

**Usage:**
```typescript
const response = await supabase.functions.invoke('payout-withdraw', {
  body: {
    amount: 9000, // in minor units
    accountNumber: '1234567890',
    accountBank: 'BANK_CODE', // Flutterwave bank code
    currency: 'USD'
  }
});
```

## Database Schema

### Transactions Table
New fields added for commission tracking:
- `platform_fee_minor_units` - Platform commission (10%)
- `net_amount_minor_units` - Amount after fees (90%)
- `payment_provider` - Always 'flutterwave'
- `external_reference` - Flutterwave transaction ID
- `payment_metadata` - Additional payment info

### Transaction Types
- `escrow` - Payment held in escrow
- `release` - Funds released to talent
- `payout` - Withdrawal to bank account

### Transaction Status
- `pending` - Awaiting completion
- `completed` - Successfully processed
- `failed` - Payment failed
- `cancelled` - Cancelled by user

## Setup Instructions

### 1. Get Flutterwave API Keys
1. Sign up at https://flutterwave.com
2. Get your API keys from the dashboard
3. Add `FLUTTERWAVE_SECRET_KEY` secret in Lovable Cloud

### 2. Configure Webhook
1. In Flutterwave dashboard, go to Settings > Webhooks
2. Add webhook URL: `https://lgdrrlrzcoedozfjwjnr.supabase.co/functions/v1/payment-webhook`
3. Optional: Set webhook secret hash as `FLUTTERWAVE_WEBHOOK_SECRET_HASH` for security

### 3. Get Bank Codes
Flutterwave uses bank codes for transfers. Get the list:
```bash
curl https://api.flutterwave.com/v3/banks/NG \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

## Money Flow Example

### Scenario: $100 job payment

1. **Employer pays $100**
   - Platform fee: $10 (10%)
   - Escrow amount: $100
   - Net to talent: $90

2. **Work completed, escrow released**
   - Talent wallet balance: +$90
   - Platform keeps: $10

3. **Talent withdraws $90**
   - Transferred to bank account
   - Wallet balance: $0

## Security

- All endpoints require authentication except webhook
- Employers can only release escrow for their own jobs
- Talents can only withdraw from their own wallet
- RLS policies prevent unauthorized access
- All amounts tracked in minor units (no decimal issues)

## Testing

Before going live:
1. Use Flutterwave test mode
2. Test payment flow with test cards
3. Verify webhook delivery
4. Test escrow release
5. Test payout withdrawal

## Support

For Flutterwave-specific issues:
- Documentation: https://developer.flutterwave.com/docs
- Support: https://flutterwave.com/support
