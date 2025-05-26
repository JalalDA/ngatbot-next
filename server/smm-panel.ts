import axios from "axios";

export interface SmmService {
  service: number;
  name: string;
  type: string;
  rate: string;
  min: number;
  max: number;
  category: string;
  refill?: boolean;
  cancel?: boolean;
}

export interface SmmOrderResponse {
  order: string;
  error?: string;
}

export interface SmmOrderStatusResponse {
  charge: string;
  start_count: string;
  status: string;
  remains: string;
  currency: string;
}

export class SmmPanelAPI {
  private apiKey: string;
  private apiEndpoint: string;

  constructor(apiKey: string, apiEndpoint: string) {
    this.apiKey = apiKey;
    this.apiEndpoint = apiEndpoint;
  }

  // Get balance from SMM Panel
  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      console.log(`💰 Fetching balance from ${this.apiEndpoint}`);
      
      // Use GET request with query parameters for balance
      const url = `${this.apiEndpoint}?action=balance&key=${this.apiKey}`;
      const response = await axios.get(url, {
        timeout: 30000
      });

      if (response.data) {
        // Handle different response formats
        let balance = 0;
        let currency = 'USD'; // Default currency

        if (typeof response.data === 'object') {
          balance = parseFloat(response.data.balance || response.data.amount || 0);
          currency = response.data.currency || 'USD';
        } else if (typeof response.data === 'string' || typeof response.data === 'number') {
          balance = parseFloat(response.data.toString());
        }

        console.log(`✅ Successfully fetched balance: ${balance} ${currency}`);
        return { balance, currency };
      } else {
        throw new Error('Invalid response format from SMM Panel');
      }
    } catch (error: any) {
      console.error('❌ Error fetching balance from SMM Panel:', error.message);
      return { balance: 0, currency: 'USD' }; // Return default instead of throwing
    }
  }

  // Get services from SMM Panel
  async getServices(): Promise<SmmService[]> {
    try {
      console.log(`🔍 Fetching services from ${this.apiEndpoint}`);
      
      // Use GET request with query parameters as per socpanel.com documentation
      const url = `${this.apiEndpoint}?action=services&key=${this.apiKey}`;
      const response = await axios.get(url, {
        timeout: 30000
      });

      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Successfully fetched ${response.data.length} services`);
        return response.data;
      } else {
        throw new Error('Invalid response format from SMM Panel');
      }
    } catch (error: any) {
      console.error('❌ Error fetching services from SMM Panel:', error.message);
      throw new Error(`Failed to fetch services: ${error.message}`);
    }
  }

  // Create order in SMM Panel
  async createOrder(serviceId: string, link: string, quantity: number): Promise<SmmOrderResponse> {
    try {
      console.log(`📝 Creating order - Service: ${serviceId}, Link: ${link}, Quantity: ${quantity}`);
      
      // Try POST with form data first (most common format)
      const formData = new URLSearchParams({
        key: this.apiKey,
        action: 'add',
        service: serviceId,
        link: link,
        quantity: quantity.toString()
      });

      const response = await axios.post(this.apiEndpoint, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      if (response.data) {
        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        console.log(`✅ Order created successfully: ${response.data.order || response.data}`);
        return {
          order: response.data.order || response.data.toString(),
          error: response.data.error
        };
      } else {
        throw new Error('Invalid response from SMM Panel');
      }
    } catch (error: any) {
      console.error('❌ Error creating order in SMM Panel:', error.message);
      
      // If POST fails, try GET method as fallback (some providers use GET for all actions)
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
        try {
          console.log(`🔄 Retrying with GET method...`);
          const url = `${this.apiEndpoint}?key=${this.apiKey}&action=add&service=${serviceId}&link=${encodeURIComponent(link)}&quantity=${quantity}`;
          const getResponse = await axios.get(url, { timeout: 30000 });
          
          if (getResponse.data) {
            if (getResponse.data.error) {
              throw new Error(getResponse.data.error);
            }
            
            console.log(`✅ Order created successfully with GET: ${getResponse.data.order || getResponse.data}`);
            return {
              order: getResponse.data.order || getResponse.data.toString(),
              error: getResponse.data.error
            };
          }
        } catch (getError: any) {
          console.error('❌ GET method also failed:', getError.message);
          throw new Error(`Failed to create order: ${error.message}. GET fallback also failed: ${getError.message}`);
        }
      }
      
      throw new Error(`Failed to create order: ${error.message}`);
    }
  }

  // Get order status from SMM Panel
  async getOrderStatus(orderId: string): Promise<SmmOrderStatusResponse> {
    try {
      console.log(`🔍 Checking order status for: ${orderId}`);
      
      // Try POST with form data first
      const formData = new URLSearchParams({
        key: this.apiKey,
        action: 'status',
        order: orderId
      });

      const response = await axios.post(this.apiEndpoint, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 30000
      });

      if (response.data) {
        console.log(`✅ Order status retrieved: ${response.data.status}`);
        return response.data;
      } else {
        throw new Error('Invalid response from SMM Panel');
      }
    } catch (error: any) {
      console.error('❌ Error checking order status:', error.message);
      
      // If POST fails, try GET method as fallback
      if (error.response?.status === 404 || error.code === 'ECONNREFUSED') {
        try {
          console.log(`🔄 Retrying status check with GET method...`);
          const url = `${this.apiEndpoint}?key=${this.apiKey}&action=status&order=${orderId}`;
          const getResponse = await axios.get(url, { timeout: 30000 });
          
          if (getResponse.data) {
            console.log(`✅ Order status retrieved with GET: ${getResponse.data.status}`);
            return getResponse.data;
          }
        } catch (getError: any) {
          console.error('❌ GET method also failed for status check:', getError.message);
        }
      }
      
      throw new Error(`Failed to check order status: ${error.message}`);
    }
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🧪 Testing connection to ${this.apiEndpoint}`);
      
      const response = await axios.post(this.apiEndpoint, {
        key: this.apiKey,
        action: 'balance'
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      if (response.data && typeof response.data.balance !== 'undefined') {
        console.log(`✅ Connection successful! Balance: $${response.data.balance}`);
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error('❌ Connection test failed:', error.message);
      return false;
    }
  }
}

// Generate unique order ID
export function generateSmmOrderId(userId: number): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `SMM${userId}${timestamp}${random}`;
}

// Auto-assign MID (1-10) for services
export function generateMid(existingMids: number[]): number {
  for (let i = 1; i <= 10; i++) {
    if (!existingMids.includes(i)) {
      return i;
    }
  }
  // If all MIDs 1-10 are taken, start from 1 again (overwrite)
  return 1;
}

// Parse rate to decimal
export function parseRate(rate: string): number {
  const numericRate = parseFloat(rate);
  return isNaN(numericRate) ? 0 : numericRate;
}

// Calculate order amount
export function calculateOrderAmount(rate: number, quantity: number): number {
  return (rate * quantity) / 1000; // Rate is usually per 1000
}