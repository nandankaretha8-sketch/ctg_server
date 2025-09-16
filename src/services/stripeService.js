const Stripe = require('stripe');

// Initialize Stripe with secret key (only if available)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = Stripe(process.env.STRIPE_SECRET_KEY);
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not found in environment variables. Stripe functionality will be disabled.');
}

class StripeService {
  /**
   * Create a Payment Intent for a payment
   * @param {Object} paymentData - Payment information
   * @returns {Object} Payment Intent object
   */
  static async createPaymentIntent(paymentData) {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
        };
      }

      const { amount, currency, metadata, customerEmail, customerName } = paymentData;

      // Create or retrieve customer
      let customerId = null;
      if (customerEmail) {
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });

        if (existingCustomers.data.length > 0) {
          customerId = existingCustomers.data[0].id;
        } else {
          const customer = await stripe.customers.create({
            email: customerEmail,
            name: customerName,
            metadata: {
              userId: metadata.userId
            }
          });
          customerId = customer.id;
        }
      }

      // Create Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency || 'usd',
        customer: customerId,
        metadata: {
          ...metadata,
          userId: metadata.userId,
          challengeId: metadata.challengeId || null,
          planId: metadata.planId || null,
          type: metadata.type || 'challenge'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        paymentIntent,
        customerId
      };
    } catch (error) {
      console.error('Error creating Payment Intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Retrieve a Payment Intent by ID
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @returns {Object} Payment Intent object
   */
  static async getPaymentIntent(paymentIntentId) {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
        };
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error retrieving Payment Intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm a Payment Intent
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @returns {Object} Confirmation result
   */
  static async confirmPaymentIntent(paymentIntentId) {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
        };
      }

      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error confirming Payment Intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel a Payment Intent
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @returns {Object} Cancellation result
   */
  static async cancelPaymentIntent(paymentIntentId) {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
        };
      }

      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return {
        success: true,
        paymentIntent
      };
    } catch (error) {
      console.error('Error cancelling Payment Intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create a refund for a Payment Intent
   * @param {string} paymentIntentId - Stripe Payment Intent ID
   * @param {number} amount - Amount to refund (optional, defaults to full amount)
   * @returns {Object} Refund result
   */
  static async createRefund(paymentIntentId, amount = null) {
    try {
      if (!stripe) {
        return {
          success: false,
          error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.'
        };
      }

      const refundData = {
        payment_intent: paymentIntentId
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripe.refunds.create(refundData);
      return {
        success: true,
        refund
      };
    } catch (error) {
      console.error('Error creating refund:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = StripeService;
