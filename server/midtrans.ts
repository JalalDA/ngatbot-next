import { MidtransClient } from 'midtrans-client';
import crypto from 'crypto';

// Initialize Midtrans clients
const snap = new MidtransClient.Snap({
  isProduction: false, // Set to true for production
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

const coreApi = new MidtransClient.CoreApi({
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
      id: `upgrade_${plan}`,
      price: planConfig.price,
      quantity: 1,
      name: planConfig.name,
      brand: 'BotBuilder AI',
      category: 'subscription',
    },
  ];

  const customerDetails = {
    first_name: userName,
    email: userEmail,
  };

  const creditCards = {
    secure: true,
  };

  const parameter = {
    transaction_details: transactionDetails,
    credit_card: creditCards,
    item_details: itemDetails,
    customer_details: customerDetails,
    callbacks: {
      finish: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard?payment=success`,
      error: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard?payment=error`,
      pending: `${process.env.FRONTEND_URL || 'http://localhost:5000'}/dashboard?payment=pending`,
    },
  };

  try {
    const transaction = await snap.createTransaction(parameter);
    return {
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
    };
  } catch (error) {
    console.error('Midtrans transaction creation error:', error);
    throw new Error('Failed to create payment transaction');
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
  const timestamp = Date.now();
  return `UPGRADE-${userId}-${plan.toUpperCase()}-${timestamp}`;
}