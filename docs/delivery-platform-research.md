# Delivery Platform Integration Research

## Research Date: December 31, 2025

---

## 1. Porter (porter.in)

### Overview
Porter is one of India's leading logistics companies providing intra-city delivery services. Founded in 2014, based in Bangalore, with presence in 21+ cities including Chennai.

### Key Features
- Fleet of 7.5L+ driver partners (two-wheelers and trucks)
- Enterprise dashboard for trip management
- Prepaid wallet system
- Multi-user access for businesses
- Real-time tracking
- Webhook updates for delivery status

### API Integration
- **API Available**: Yes, Porter offers API integration for businesses
- **Documentation**: Contact required - https://porter.in/api-integrations
- **Integration Method**: 
  - Direct API integration
  - Third-party platforms (ClickPost, Shiprocket)
- **Features via API**:
  - Create delivery orders
  - Live tracking
  - Webhook updates for status changes
  - Delivery authentication

### Onboarding Process
1. Fill enterprise form at porter.in/enterprise
2. Account activation within 1 business day
3. Training module provided
4. Prepaid wallet setup required

### Contact
- Phone: 080 4410 4410 / 9667309777
- Email: help@porter.in / help@theporter.in

### Pricing Model
- Prepaid wallet system
- Distance-based pricing
- Vehicle type affects pricing (two-wheeler vs truck)

---

## 2. Rapido (rapido.bike)

### Overview
Rapido is India's largest bike taxi platform, now expanding into food delivery with "Ownly" platform. Has 2 million+ two-wheeler riders.

### Ownly Food Delivery Platform (NEW - June 2025)
- **Zero-commission model** for restaurants
- Flat subscription fee instead of percentage commission
- Partnership with NRAI (50,000+ restaurants)
- Currently piloting in Bengaluru

### Delivery Pricing (via Ownly)
| Order Value | Delivery Cost | Customer Pays |
|-------------|---------------|---------------|
| ≤ ₹100 | ₹10 | ₹20 |
| ₹100-400 | ₹25 + GST | ₹25 + GST |
| > ₹400 | ₹50 | ₹50 |

### API Integration
- **Direct API**: Not publicly documented yet
- **Corporate API**: Available for employee travel management
- **Third-party Integration**: Via platforms like uEngage

### Key Differentiators
- Zero commission model (vs 25-35% on Zomato/Swiggy)
- Restaurant keeps customer database
- Uniform pricing (online = offline)
- No packaging charge additions allowed

### Contact
- Corporate Partners: rapido.bike/CorporatePartners
- General: Through app or website

---

## 3. Dunzo

### Overview
Hyperlocal delivery startup founded in 2014 in Bangalore. Backed by Google. Operational in Bangalore, Pune, Gurgaon, Hyderabad, New Delhi, Chennai, Mumbai.

### Services
- Grocery delivery
- Food delivery
- P2P (person-to-person) package delivery
- Essential items delivery

### API Integration
- **API Available**: Yes, through third-party platforms
- **Integration Partners**:
  - ClickPost (1-day integration)
  - Shiprocket
  - Shipway
  - Synkka AI

### Features
- Real-time tracking
- Digital wallet
- Web and app-based ordering
- Same-day delivery

---

## 4. Alternative: ONDC (Open Network for Digital Commerce)

### Overview
Government-backed open network that allows any seller to connect with any buyer through interoperable protocols.

### Benefits for Taiwan Maami
- Lower commission rates
- Multiple delivery partners
- Transparent pricing
- Growing adoption

### Integration
- Requires ONDC-compliant seller app
- Multiple logistics providers available

---

## Recommended Integration Strategy

### Phase 1: Porter Integration (Immediate)
**Why Porter First:**
1. Established API documentation
2. Available in Chennai
3. Good for food delivery (two-wheelers)
4. Transparent pricing
5. Quick onboarding (1 day)

**Implementation Steps:**
1. Register for Porter Enterprise account
2. Request API access
3. Integrate order creation API
4. Implement webhook for status updates
5. Add real-time tracking to customer order page

### Phase 2: Rapido Ownly (When Available in Chennai)
**Why Rapido:**
1. Zero-commission model
2. Large rider network
3. Restaurant-friendly terms
4. Currently expanding from Bengaluru

**Action Items:**
1. Monitor Ownly expansion to Chennai
2. Register interest with Rapido
3. Prepare for integration when available

### Phase 3: Dunzo (Optional)
**Considerations:**
- Good for hyperlocal delivery
- Multiple integration options
- May overlap with Porter coverage

---

## Technical Integration Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Taiwan Maami Website                      │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ Order System │───▶│ Delivery     │───▶│ Customer     │  │
│  │              │    │ Orchestrator │    │ Tracking     │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               ▼
              ┌────────────────────────────────┐
              │     Delivery Provider APIs      │
              │                                │
              │  ┌────────┐  ┌────────┐       │
              │  │ Porter │  │ Rapido │  ...  │
              │  └────────┘  └────────┘       │
              └────────────────────────────────┘
```

### Key API Endpoints Needed

| Function | Porter | Rapido |
|----------|--------|--------|
| Create Order | POST /orders | TBD |
| Get Quote | POST /quote | TBD |
| Track Order | GET /orders/{id}/track | TBD |
| Cancel Order | DELETE /orders/{id} | TBD |
| Webhook Status | Callback URL | TBD |

---

## Next Steps

1. **Contact Porter Enterprise** (porter.in/enterprise)
   - Fill enterprise registration form
   - Request API documentation
   - Set up prepaid wallet

2. **Monitor Rapido Ownly**
   - Track Chennai launch date
   - Register interest early

3. **Evaluate ONDC**
   - Research ONDC seller app options
   - Consider for future multi-platform strategy

---

## Resources

- Porter Enterprise: https://porter.in/enterprise
- Porter API: https://porter.in/api-integrations
- Rapido Corporate: https://www.rapido.bike/CorporatePartners
- ClickPost (Integration Platform): https://www.clickpost.ai
- ONDC: https://ondc.org
