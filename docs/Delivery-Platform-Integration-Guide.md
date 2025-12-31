# Delivery Platform Integration Guide for Taiwan Maami

**Prepared by:** Manus AI  
**Date:** December 31, 2025  
**Version:** 1.0

---

## Executive Summary

This document provides a comprehensive analysis of delivery platform integration options for Taiwan Maami's online ordering system. The research focuses on **Porter** and **Rapido** as primary delivery partners, with additional consideration of **Dunzo** and the **ONDC** network. The goal is to enable seamless last-mile delivery for customers ordering through the Taiwan Maami website, providing an alternative to traditional aggregator platforms like Zomato and Swiggy.

---

## 1. Market Context

The food delivery landscape in India is undergoing significant transformation. Traditional aggregators like Zomato and Swiggy charge restaurants between 25-35% commission on each order, creating financial pressure on restaurant margins [1]. New entrants like Rapido's Ownly platform are disrupting this model with zero-commission approaches, while established logistics players like Porter offer transparent, distance-based pricing for hyperlocal delivery.

For Taiwan Maami, integrating with these delivery platforms offers several advantages:

- **Cost transparency** with clear per-delivery pricing instead of percentage-based commissions
- **Customer data ownership** allowing direct relationship building with customers
- **Flexible delivery options** enabling customers to choose their preferred delivery partner
- **Real-time tracking** improving customer experience and reducing support inquiries

---

## 2. Porter Integration

### 2.1 Company Overview

Porter is one of India's leading logistics companies, founded in 2014 and headquartered in Bangalore. The platform operates across 21+ cities including Chennai, with a network of over 750,000 driver partners [2]. Porter specializes in intra-city goods transportation using two-wheelers, mini trucks, and tempos.

### 2.2 Enterprise Features

Porter Enterprise provides businesses with a comprehensive logistics management solution:

| Feature | Description |
|---------|-------------|
| **Unified Dashboard** | Centralized view of all trip details and delivery status |
| **Prepaid Wallet** | No cash handling; all trips paid from corporate wallet |
| **Multi-User Access** | Add/remove users with role-based permissions |
| **API Integration** | Webhook updates, live tracking, delivery authentication |
| **Account Statements** | Bi-weekly reports for expense tracking |

### 2.3 API Integration Capabilities

Porter offers API integration for businesses requiring programmatic delivery booking. The integration provides:

> "An API Integration with Porter helps companies with webhook updates, live tracking, and delivery authentication across 16 cities. Utilise a standardised 2-wheeler or 4-wheeler fleet for your business needs." [2]

**Key API Functions:**
- Create delivery orders programmatically
- Receive real-time status updates via webhooks
- Track deliveries with live location data
- Authenticate deliveries with OTP verification

### 2.4 Onboarding Process

The Porter Enterprise onboarding is straightforward:

1. **Registration**: Fill the enterprise form at porter.in/enterprise with business details
2. **Activation**: Account activated within 1 business day
3. **Training**: Training module provided for booking process
4. **Wallet Setup**: Load prepaid wallet for delivery payments
5. **API Access**: Request API documentation and credentials

### 2.5 Pricing Structure

Porter uses a distance-based pricing model with prepaid wallet payments. Pricing varies by:
- Distance of delivery
- Vehicle type (two-wheeler vs truck)
- City and zone

For food delivery, two-wheeler pricing is most relevant, typically ranging from ₹30-80 for distances under 5km in Chennai.

### 2.6 Contact Information

| Channel | Details |
|---------|---------|
| Phone | 080 4410 4410 |
| Enterprise Hotline | 9667309777 |
| Email | help@porter.in |
| Website | porter.in/enterprise |

---

## 3. Rapido Integration

### 3.1 Company Overview

Rapido is India's largest bike taxi platform with over 2 million two-wheeler riders. In June 2025, Rapido launched **Ownly**, a food delivery platform designed to compete with Zomato and Swiggy using a restaurant-friendly model [3].

### 3.2 Ownly Platform Features

Ownly represents a paradigm shift in food delivery economics:

> "The new platform will operate on a zero-commission model, charging restaurants a flat subscription fee. Under the agreement, restaurants will not be permitted to add packaging charges separately, and pricing across online and offline channels will be kept uniform." [3]

**Key Differentiators:**

| Aspect | Ownly (Rapido) | Traditional Aggregators |
|--------|----------------|------------------------|
| Commission | Zero (flat subscription) | 25-35% per order |
| Customer Data | Shared with restaurants | Retained by platform |
| Pricing | Uniform online/offline | Often marked up online |
| Packaging Charges | Not allowed separately | Often added |

### 3.3 Delivery Pricing

Ownly's delivery pricing is transparent and restaurant-subsidized within 4km:

| Order Value | Delivery Cost (Restaurant Pays) | Customer Pays |
|-------------|--------------------------------|---------------|
| ≤ ₹100 | ₹10 | ₹20 |
| ₹100 - ₹400 | ₹25 + GST | ₹25 + GST |
| > ₹400 | ₹50 | ₹50 |

### 3.4 Current Availability

As of December 2025, Ownly is piloting in select areas of Bengaluru (Koramangala, HSR Layout) with plans to expand to other cities [4]. The platform has partnered with the National Restaurant Association of India (NRAI), representing over 50,000 restaurants.

### 3.5 Integration Options

**Current State:**
- Direct API documentation not publicly available
- Integration possible through third-party platforms like uEngage
- Corporate API available for employee travel management

**Recommended Approach:**
- Monitor Ownly expansion to Chennai
- Register interest early through Rapido business channels
- Prepare integration architecture for quick deployment when available

---

## 4. Alternative Platforms

### 4.1 Dunzo

Dunzo is a hyperlocal delivery platform backed by Google, operational in Chennai and other major cities. While primarily focused on grocery and package delivery, Dunzo can be used for food delivery through P2P (person-to-person) delivery mode [5].

**Integration Options:**
- ClickPost integration (1-day setup)
- Shiprocket integration
- Direct API (limited documentation)

### 4.2 ONDC (Open Network for Digital Commerce)

ONDC is a government-backed initiative creating an open, interoperable network for digital commerce. Porter has joined ONDC to expand its hyperlocal delivery capabilities [6].

**Benefits:**
- Lower commission rates
- Multiple delivery partners on single network
- Transparent pricing
- Growing merchant and customer adoption

---

## 5. Recommended Integration Strategy

### Phase 1: Porter Integration (Immediate - Q1 2026)

Porter should be the first integration due to:
- Established API infrastructure
- Available in Chennai
- Quick onboarding (1 day)
- Suitable for food delivery (two-wheelers)
- Transparent, predictable pricing

**Implementation Timeline:**

| Week | Activity |
|------|----------|
| 1 | Register Porter Enterprise account |
| 2 | Receive API documentation and credentials |
| 3 | Develop integration module |
| 4 | Testing and QA |
| 5 | Soft launch with select orders |
| 6 | Full deployment |

### Phase 2: Rapido Ownly (Q2-Q3 2026)

Monitor Ownly's expansion to Chennai and integrate when available:
- Zero-commission model significantly improves margins
- Large rider network ensures availability
- Restaurant-friendly terms align with business goals

### Phase 3: Multi-Platform Support (Q4 2026)

Implement delivery orchestration layer supporting multiple providers:
- Automatic selection based on availability and pricing
- Fallback options if primary provider unavailable
- Customer choice for delivery partner

---

## 6. Technical Architecture

### 6.1 System Design

The delivery integration should follow a modular architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                     Taiwan Maami Backend                         │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │    Order     │───▶│    Delivery      │───▶│   Webhook    │  │
│  │   Service    │    │   Orchestrator   │    │   Handler    │  │
│  └──────────────┘    └──────────────────┘    └──────────────┘  │
│                              │                       │          │
└──────────────────────────────┼───────────────────────┼──────────┘
                               │                       │
                               ▼                       ▼
              ┌────────────────────────────────────────────────┐
              │           Delivery Provider APIs                │
              │                                                 │
              │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
              │  │  Porter  │  │  Rapido  │  │  Dunzo   │     │
              │  │   API    │  │   API    │  │   API    │     │
              │  └──────────┘  └──────────┘  └──────────┘     │
              └────────────────────────────────────────────────┘
```

### 6.2 Database Schema Extensions

New tables required for delivery tracking:

```sql
-- Delivery orders table
CREATE TABLE delivery_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  provider ENUM('porter', 'rapido', 'dunzo') NOT NULL,
  provider_order_id VARCHAR(100),
  status ENUM('pending', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'),
  pickup_address TEXT,
  delivery_address TEXT,
  estimated_delivery_time DATETIME,
  actual_delivery_time DATETIME,
  delivery_fee INT, -- in paise
  tracking_url VARCHAR(500),
  driver_name VARCHAR(100),
  driver_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Delivery status history
CREATE TABLE delivery_status_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  delivery_order_id INT NOT NULL,
  status VARCHAR(50),
  message TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id)
);
```

### 6.3 API Endpoints

New tRPC procedures for delivery management:

| Procedure | Type | Description |
|-----------|------|-------------|
| `delivery.getQuote` | Query | Get delivery price estimate |
| `delivery.createOrder` | Mutation | Book delivery with provider |
| `delivery.getStatus` | Query | Get current delivery status |
| `delivery.cancelOrder` | Mutation | Cancel pending delivery |
| `delivery.handleWebhook` | Mutation | Process provider status updates |

---

## 7. Customer Experience Flow

### 7.1 Checkout Flow with Delivery

1. Customer adds items to cart
2. Selects "Delivery" mode
3. Enters/confirms delivery address
4. System fetches delivery quotes from available providers
5. Customer sees delivery fee and estimated time
6. Customer completes payment (order total + delivery fee)
7. Order confirmed, delivery automatically booked
8. Customer receives tracking link via SMS/email
9. Real-time status updates on order page
10. Delivery completed, customer notified

### 7.2 Order Tracking Page

The customer order tracking page should display:
- Order status (preparing, ready for pickup, out for delivery)
- Delivery partner name and contact
- Driver name and vehicle details
- Live map with driver location
- Estimated arrival time
- Delivery OTP for verification

---

## 8. Financial Analysis

### 8.1 Cost Comparison

Assuming average order value of ₹400:

| Platform | Commission/Fee | Net to Restaurant |
|----------|----------------|-------------------|
| Zomato/Swiggy | ~30% (₹120) | ₹280 |
| Porter (direct) | ~₹50 delivery | ₹350* |
| Rapido Ownly | ₹50 delivery | ₹350* |

*Customer pays delivery fee separately

### 8.2 Break-Even Analysis

With direct delivery integration:
- **Fixed Costs**: Development (one-time), Porter wallet top-up
- **Variable Costs**: Per-delivery fee (₹30-80)
- **Savings**: 25-35% commission eliminated

For 100 delivery orders/month at ₹400 average:
- Aggregator model: ₹12,000 in commissions
- Direct delivery: ~₹5,000 in delivery fees (customer-paid)
- **Monthly savings: ₹7,000+**

---

## 9. Next Steps

### Immediate Actions (This Week)

1. **Register for Porter Enterprise**
   - Visit porter.in/enterprise
   - Fill business registration form
   - Provide: Business name, GST, contact details

2. **Request API Documentation**
   - Contact Porter at help@porter.in
   - Specify: Food delivery integration requirement
   - Request: API docs, sandbox credentials

3. **Prepare Technical Infrastructure**
   - Create delivery module in codebase
   - Set up webhook endpoint
   - Design database schema

### Short-Term (Next 30 Days)

4. **Develop Porter Integration**
   - Implement order creation API
   - Build webhook handler
   - Create customer tracking UI

5. **Testing and QA**
   - Test with real deliveries
   - Verify webhook processing
   - Validate tracking accuracy

### Medium-Term (Next 90 Days)

6. **Monitor Rapido Ownly**
   - Track Chennai launch announcements
   - Register interest with Rapido

7. **Evaluate ONDC**
   - Research seller app options
   - Consider multi-platform strategy

---

## 10. References

[1] Business Standard. "Rapido enters food aggregation with 'Ownly' platform, partners NRAI." June 9, 2025. https://www.business-standard.com/industry/news/rapido-enters-food-aggregation-with-ownly-platform-partners-nrai-125060901165_1.html

[2] Porter India. "Porter Enterprise - Centralised Logistics Control for Business Expansion." https://porter.in/enterprise

[3] Business Standard. "Rapido Ownly Terms and Conditions." June 2025.

[4] MediaNama. "Rapido Partners With Magicpin To Expand Ownly." November 25, 2025. https://www.medianama.com/2025/11/223-rapido-magicpin-ownly-indias-food-delivery-market/

[5] ClickPost. "Dunzo API Integration and Tracking." https://www.clickpost.ai/carrier-integration/dunzo

[6] Medial. "Porter Joins ONDC To Expand Its Hyperlocal Delivery Playbook." https://medial.app/news/porter-joins-ondc-to-expand-its-hyperlocal-delivery-playbook

---

*This document will be updated as new information becomes available and integration progresses.*
