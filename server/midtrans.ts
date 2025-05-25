import pkg from 'midtrans-client';
const { Snap, CoreApi } = pkg;
import crypto from 'crypto';

// Validate environment variables
function validateMidtransConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;
  const merchantId = process.env.MIDTRANS_MERCHANT_ID;

  if (!serverKey || !clientKey || !merchantId) {
    throw new Error('Midtrans configuration incomplete. Please check your API keys.');
  }

  if (!serverKey.startsWith('SB-Mid-server-') && !serverKey.startsWith('Mid-server-')) {
    throw new Error('Invalid Midtrans Server Key format');
  }

  if (!clientKey.startsWith('SB-Mid-client-') && !clientKey.startsWith('Mid-client-')) {
    throw new Error('Invalid Midtrans Client Key format');
  }

  console.log('Midtrans configuration validated successfully');
  console.log('Server Key:', serverKey.substring(0, 20) + '...');
  console.log('Client Key:', clientKey.substring(0, 20) + '...');
  console.log('Merchant ID:', merchantId);
}

// Validate config on startup
validateMidtransConfig();

// Initialize Midtrans clients
const snap = new Snap({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

const coreApi = new CoreApi({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

// Plan configurations
export const UPGRADE_PLANS = {
  pro: {
    name: 'Paket PRO',
    price: 299000,
    credits: 10000,
    level: 'pro'
  },
  business: {
    name: 'Paket BISNIS', 
    price: 550000,
    credits: 20000,
    level: 'business'
  }
} as const;

export type PlanType = keyof typeof UPGRADE_PLANS;

interface CreateTransactionParams {
  orderId: string;
  userId: number;
  userName: string;
  userEmail: string;
  plan: PlanType;
  amount?: number;
  itemDetails?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
}

export async function createMidtransTransaction(params: CreateTransactionParams) {
  const { orderId, userId, userName, userEmail, plan, amount, itemDetails } = params;
  
  // Use custom amount and items if provided, otherwise use plan config
  let finalAmount: number;
  let finalItems: any[];

  if (amount && itemDetails) {
    // Custom transaction (for chatbot non-AI)
    finalAmount = amount;
    finalItems = itemDetails;
  } else {
    // Standard plan transaction
    const planConfig = UPGRADE_PLANS[plan];
    if (!planConfig) {
      throw new Error('Invalid plan selected');
    }
    finalAmount = planConfig.price;
    finalItems = [
      {
        id: plan,
        name: `Paket ${planConfig.name}`,
        quantity: 1,
        price: planConfig.price,
      },
    ];
  }

  // Minimal parameter structure to avoid validation errors
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: finalAmount,
    },
    item_details: finalItems,
    customer_details: {
      first_name: userName.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
      email: userEmail,
    },
  };

  console.log('Midtrans parameter:', JSON.stringify(parameter, null, 2));

  try {
    const transaction = await snap.createTransaction(parameter);
    console.log('Midtrans transaction created successfully:', transaction.token);
    return {
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      order_id: orderId,
      qris_url: transaction.redirect_url, // For QRIS payments
      redirect_url: transaction.redirect_url,
    };
  } catch (error) {
    console.error('Midtrans transaction creation error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create payment transaction: ${(error as any).message || error}`);
  }
}

export async function getTransactionStatus(orderId: string) {
  try {
    const statusResponse = await coreApi.transaction.status(orderId);
    return statusResponse;
  } catch (error) {
    console.error('Failed to get transaction status:', error);
    throw new Error('Failed to get transaction status');
  }
}

export function verifySignatureKey(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY!;
  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');
  
  return hash === signatureKey;
}

export function generateOrderId(userId: number, plan: PlanType): string {
  const timestamp = Date.now().toString();
  return `TXN${timestamp.slice(-6)}${userId}`;
}