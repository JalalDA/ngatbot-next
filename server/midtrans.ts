import pkg from 'midtrans-client';
const { Snap, CoreApi } = pkg;
import crypto from 'crypto';

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
}

export async function createMidtransTransaction(params: CreateTransactionParams) {
  const { orderId, userId, userName, userEmail, plan } = params;
  const planConfig = UPGRADE_PLANS[plan];

  if (!planConfig) {
    throw new Error('Invalid plan selected');
  }

  const transactionDetails = {
    order_id: orderId,
    gross_amount: planConfig.price,
  };

  const itemDetails = [
    {
      id: plan,
      name: `Paket ${planConfig.name}`,
      quantity: 1,
      price: planConfig.price,
    },
  ];

  const customerDetails = {
    first_name: userName,
    email: userEmail,
  };

  const creditCards = {
    secure: true,
  };

  // Minimal parameter structure to avoid validation errors
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: planConfig.price,
    },
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
    };
  } catch (error) {
    console.error('Midtrans transaction creation error:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Failed to create payment transaction: ${error.message || error}`);
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