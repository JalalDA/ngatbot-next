import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { apiKeys, smmServices, smmOrders, users } from '../shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { SmmPanelAPI, generateSmmOrderId, calculateOrderAmount } from './smm-panel.js';
import crypto from 'crypto';

// Interface untuk response API yang kompatibel dengan idcdigitals.com format
interface ApiResponse<T = any> {
  status?: string;
  balance?: string;
  currency?: string;
  services?: Array<{
    service: number;
    name: string;
    type: string;
    rate: string;
    min: number;
    max: number;
    category: string;
    refill?: boolean;
    cancel?: boolean;
  }>;
  order?: string;
  error?: string;
  charge?: string;
  start_count?: string;
  remains?: string;
}

/**
 * Middleware untuk validasi API Key
 */
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.body.key || req.query.key;
    
    if (!apiKey) {
      return res.status(400).json({
        error: 'API key is required'
      });
    }

    // Cari API key di database
    const apiKeyRecord = await db
      .select({
        id: apiKeys.id,
        userId: apiKeys.userId,
        isActive: apiKeys.isActive,
        keyName: apiKeys.keyName
      })
      .from(apiKeys)
      .where(and(
        eq(apiKeys.apiKey, apiKey),
        eq(apiKeys.isActive, true)
      ))
      .limit(1);

    if (apiKeyRecord.length === 0) {
      return res.status(401).json({
        error: 'Invalid API key'
      });
    }

    // Update last used dan total requests (non-blocking)
    setImmediate(async () => {
      try {
        const currentRequests = await db
          .select({ totalRequests: apiKeys.totalRequests })
          .from(apiKeys)
          .where(eq(apiKeys.id, apiKeyRecord[0].id))
          .limit(1);
        
        await db
          .update(apiKeys)
          .set({
            lastUsed: new Date(),
            totalRequests: (currentRequests[0]?.totalRequests || 0) + 1
          })
          .where(eq(apiKeys.id, apiKeyRecord[0].id));
      } catch (updateError) {
        console.error('Background API key update error:', updateError);
      }
    });

    // Attach user info ke request
    req.apiUser = {
      id: apiKeyRecord[0].userId,
      apiKeyId: apiKeyRecord[0].id,
      keyName: apiKeyRecord[0].keyName
    };

    next();
  } catch (error) {
    console.error('API key validation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * GET /api/v2 - Get user balance
 * Compatible dengan format N1Panel.com
 */
export async function getBalance(req: Request, res: Response) {
  try {
    if (!req.apiUser) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user data
    const user = await db
      .select({
        credits: users.credits,
        level: users.level
      })
      .from(users)
      .where(eq(users.id, req.apiUser.id))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Convert credits to balance format yang konsisten dengan N1Panel
    const balance = (user[0].credits / 100).toFixed(7);

    res.json({
      balance: balance,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * POST /api/v2 - Get services list
 * Compatible dengan format N1Panel.com
 */
export async function getServices(req: Request, res: Response) {
  try {
    if (!req.apiUser) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get services milik user yang memiliki API key ini
    const services = await db
      .select({
        id: smmServices.id,
        mid: smmServices.mid,
        name: smmServices.name,
        description: smmServices.description,
        min: smmServices.min,
        max: smmServices.max,
        rate: smmServices.rate,
        category: smmServices.category,
        isActive: smmServices.isActive
      })
      .from(smmServices)
      .where(and(
        eq(smmServices.isActive, true),
        eq(smmServices.userId, req.apiUser.id)
      ));

    // Format services dengan struktur yang konsisten dengan N1Panel
    const formattedServices = services.map(service => ({
      service: service.mid,
      name: service.name,
      type: 'Default',
      rate: service.rate.toString(),
      min: service.min,
      max: service.max,
      category: service.category || 'Social Media',
      refill: true,
      cancel: true
    }));

    res.json(formattedServices);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * POST /api/v2 - Create new order
 * Compatible dengan format N1Panel.com
 */
export async function createOrder(req: Request, res: Response) {
  try {
    const { action, service, link, quantity } = req.body;
    
    if (action !== 'add') {
      return res.status(400).json({
        error: 'Invalid action'
      });
    }

    if (!service || !link || !quantity) {
      return res.status(400).json({
        error: 'Missing required parameters'
      });
    }

    if (!req.apiUser) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Find service by MID
    const serviceRecord = await db
      .select()
      .from(smmServices)
      .where(and(
        eq(smmServices.mid, parseInt(service)),
        eq(smmServices.userId, req.apiUser.id),
        eq(smmServices.isActive, true)
      ))
      .limit(1);

    if (serviceRecord.length === 0) {
      return res.status(404).json({
        error: 'Service not found'
      });
    }

    const smmService = serviceRecord[0];

    // Validate quantity
    if (quantity < smmService.min || quantity > smmService.max) {
      return res.status(400).json({
        error: `Quantity must be between ${smmService.min} and ${smmService.max}`
      });
    }

    // Calculate amount
    const amount = calculateOrderAmount(parseFloat(smmService.rate), quantity);

    // Check user balance
    const user = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, req.apiUser.id))
      .limit(1);

    if (user.length === 0 || user[0].credits < amount * 100) { // credits in cents
      return res.status(400).json({
        error: 'Insufficient balance'
      });
    }

    // Generate order ID
    const orderId = generateSmmOrderId(req.apiUser.id);

    // Create order in database
    const newOrder = await db
      .insert(smmOrders)
      .values({
        userId: req.apiUser.id,
        serviceId: smmService.id,
        providerId: smmService.providerId,
        orderId: orderId,
        link: link,
        quantity: quantity,
        amount: amount.toString(),
        status: 'pending',
        paymentStatus: 'pending'
      })
      .returning({ id: smmOrders.id });

    // Deduct balance
    await db
      .update(users)
      .set({
        credits: user[0].credits - (amount * 100)
      })
      .where(eq(users.id, req.apiUser.id));

    // Update API key revenue
    const currentApiKey = await db
      .select({ 
        totalOrders: apiKeys.totalOrders, 
        totalRevenue: apiKeys.totalRevenue 
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, req.apiUser.apiKeyId))
      .limit(1);

    if (currentApiKey.length > 0) {
      await db
        .update(apiKeys)
        .set({
          totalOrders: currentApiKey[0].totalOrders + 1,
          totalRevenue: (parseFloat(currentApiKey[0].totalRevenue) + amount).toString()
        })
        .where(eq(apiKeys.id, req.apiUser.apiKeyId));
    }

    res.json({
      order: orderId
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * POST /api/v2 - Get order status
 * Compatible dengan format idcdigitals.com
 */
export async function getOrderStatus(req: Request, res: Response) {
  try {
    const { action, order } = req.body;
    
    if (action !== 'status') {
      return res.json({
        error: 'Invalid action'
      });
    }

    if (!order) {
      return res.json({
        error: 'Order ID is required'
      });
    }

    // Find order
    const orderRecord = await db
      .select({
        orderId: smmOrders.orderId,
        status: smmOrders.status,
        amount: smmOrders.amount,
        startCount: smmOrders.startCount,
        remains: smmOrders.remains
      })
      .from(smmOrders)
      .where(and(
        eq(smmOrders.orderId, order),
        eq(smmOrders.userId, req.apiUser.id)
      ))
      .limit(1);

    if (orderRecord.length === 0) {
      return res.json({
        error: 'Order not found'
      });
    }

    const orderData = orderRecord[0];

    res.json({
      charge: orderData.amount.toString(),
      start_count: orderData.startCount?.toString() || '0',
      status: orderData.status,
      remains: orderData.remains?.toString() || '0',
      currency: 'USD'
    });
  } catch (error) {
    console.error('Get order status error:', error);
    res.json({
      error: 'Internal server error'
    });
  }
}

/**
 * Generate API key untuk user
 */
export function generateApiKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Extend Request interface untuk type safety
declare global {
  namespace Express {
    interface Request {
      apiUser?: {
        id: number;
        apiKeyId: number;
        keyName: string;
      };
    }
  }
}