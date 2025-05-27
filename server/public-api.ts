import { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import { apiKeys, apiUsageLogs, smmServices, smmOrders, users } from '../shared/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

// Middleware untuk validasi API key
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'API key required',
        message: 'Please provide X-API-Key header'
      });
    }

    // Cari API key di database
    const [keyRecord] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.apiKey, apiKey),
        eq(apiKeys.isActive, true)
      ));

    if (!keyRecord) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or inactive'
      });
    }

    // Update request count dan last used
    await db
      .update(apiKeys)
      .set({
        requestCount: keyRecord.requestCount + 1,
        lastUsedAt: new Date()
      })
      .where(eq(apiKeys.id, keyRecord.id));

    // Log usage
    await db.insert(apiUsageLogs).values({
      apiKeyId: keyRecord.id,
      endpoint: req.path,
      method: req.method,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      responseStatus: 200,
      responseTime: Date.now() - startTime
    });

    // Attach user info to request
    (req as any).apiUser = keyRecord;
    next();
  } catch (error) {
    console.error('API Key validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate API key'
    });
  }
}

// Generate API key
export function generateApiKey(): string {
  return `dp_${crypto.randomBytes(32).toString('hex')}`;
}

// Rate limiting per API key
const rateLimitMap = new Map<number, { count: number; resetTime: number }>();

export function rateLimitMiddleware(maxRequests: number = 1000, windowMs: number = 3600000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiUser = (req as any).apiUser;
    if (!apiUser) return next();

    const now = Date.now();
    const rateLimit = rateLimitMap.get(apiUser.id);

    if (!rateLimit || now > rateLimit.resetTime) {
      rateLimitMap.set(apiUser.id, {
        count: 1,
        resetTime: now + windowMs
      });
      return next();
    }

    if (rateLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `Maximum ${maxRequests} requests per hour allowed`,
        resetTime: new Date(rateLimit.resetTime).toISOString()
      });
    }

    rateLimit.count++;
    next();
  };
}

// Public API endpoints
export const publicApiRoutes = {
  // GET /api/public/services - Daftar semua layanan
  async getServices(req: Request, res: Response) {
    try {
      const { category, page = 1, limit = 50 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = db
        .select({
          id: smmServices.id,
          mid: smmServices.mid,
          name: smmServices.name,
          description: smmServices.description,
          category: smmServices.category,
          min: smmServices.min,
          max: smmServices.max,
          rate: smmServices.rate,
          isActive: smmServices.isActive
        })
        .from(smmServices)
        .where(eq(smmServices.isActive, true));

      if (category) {
        query = query.where(eq(smmServices.category, category as string));
      }

      const services = await query
        .limit(Number(limit))
        .offset(offset)
        .orderBy(smmServices.category, smmServices.name);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(smmServices)
        .where(eq(smmServices.isActive, true));

      res.json({
        success: true,
        data: services,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(count),
          totalPages: Math.ceil(Number(count) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get services error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch services'
      });
    }
  },

  // GET /api/public/services/categories - Daftar kategori
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await db
        .selectDistinct({ category: smmServices.category })
        .from(smmServices)
        .where(eq(smmServices.isActive, true))
        .orderBy(smmServices.category);

      res.json({
        success: true,
        data: categories.map(c => c.category)
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch categories'
      });
    }
  },

  // POST /api/public/order - Buat order baru
  async createOrder(req: Request, res: Response) {
    try {
      const { service, link, quantity } = req.body;
      const apiUser = (req as any).apiUser;

      if (!service || !link || !quantity) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'service, link, and quantity are required'
        });
      }

      // Validasi service exists
      const [serviceRecord] = await db
        .select()
        .from(smmServices)
        .where(and(
          eq(smmServices.mid, Number(service)),
          eq(smmServices.isActive, true)
        ));

      if (!serviceRecord) {
        return res.status(404).json({
          error: 'Service not found',
          message: 'Invalid service ID or service is inactive'
        });
      }

      // Validasi quantity
      if (quantity < serviceRecord.min || quantity > serviceRecord.max) {
        return res.status(400).json({
          error: 'Invalid quantity',
          message: `Quantity must be between ${serviceRecord.min} and ${serviceRecord.max}`
        });
      }

      // Calculate amount
      const rate = Number(serviceRecord.rate);
      const amount = Math.ceil((rate * quantity) / 1000);

      // Generate order ID
      const orderId = `API_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create order
      const [order] = await db.insert(smmOrders).values({
        userId: apiUser.userId,
        serviceId: serviceRecord.id,
        providerId: serviceRecord.providerId,
        orderId,
        providerOrderId: '', // Will be filled later
        transactionId: orderId,
        link,
        quantity,
        amount,
        status: 'pending',
        paymentStatus: 'paid', // API orders are considered pre-paid
        startCount: 0,
        remains: quantity,
        notes: `Order created via API by key: ${apiUser.keyName}`
      }).returning();

      res.json({
        success: true,
        data: {
          order: order.orderId,
          status: order.status,
          service: serviceRecord.name,
          link: order.link,
          quantity: order.quantity,
          charge: amount,
          start_count: order.startCount,
          remains: order.remains
        }
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to create order'
      });
    }
  },

  // GET /api/public/order/status/:orderId - Cek status order
  async getOrderStatus(req: Request, res: Response) {
    try {
      const { orderId } = req.params;
      const apiUser = (req as any).apiUser;

      const [order] = await db
        .select({
          orderId: smmOrders.orderId,
          status: smmOrders.status,
          startCount: smmOrders.startCount,
          remains: smmOrders.remains,
          amount: smmOrders.amount,
          createdAt: smmOrders.createdAt
        })
        .from(smmOrders)
        .where(and(
          eq(smmOrders.orderId, orderId),
          eq(smmOrders.userId, apiUser.userId)
        ));

      if (!order) {
        return res.status(404).json({
          error: 'Order not found',
          message: 'Order ID not found or access denied'
        });
      }

      res.json({
        success: true,
        data: {
          order: order.orderId,
          status: order.status,
          charge: order.amount,
          start_count: order.startCount,
          remains: order.remains,
          currency: 'IDR'
        }
      });
    } catch (error) {
      console.error('Get order status error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch order status'
      });
    }
  },

  // GET /api/public/balance - Cek balance (for compatibility)
  async getBalance(req: Request, res: Response) {
    try {
      const apiUser = (req as any).apiUser;
      
      // Get user credits
      const [user] = await db
        .select({ credits: users.credits })
        .from(users)
        .where(eq(users.id, apiUser.userId));

      res.json({
        success: true,
        data: {
          balance: user?.credits || 0,
          currency: 'IDR'
        }
      });
    } catch (error) {
      console.error('Get balance error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch balance'
      });
    }
  }
};