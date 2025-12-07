# Employee Master API Integration Notes

## API Details
- **Base URL**: `https://3000-i9qjw73kiwqjncjws0zav-6d517277.manusvm.computer/api/v1`
- **API Key**: `tk_wJc0dBYo_tN7ufoBqDGUlvqltHyJ2qVAygrlhgGwvJoLvbPv`
- **Auth Header**: `X-API-Key: {apiKey}`

## Key Endpoints

### 1. Staff Login (by mobile)
- `GET /employees/by-mobile/{mobile}`
- Returns: employee data with status, primaryOutlet, role, department

### 2. Get Employee by ID
- `GET /employees/{id}`
- Returns: full employee details including salary/commission structure

### 3. List Active Employees
- `GET /employees?status=active&limit=100`
- Returns: array of active employees

## Employee Data Structure
```json
{
  "id": "number",
  "employeeCode": "string",
  "name": "string",
  "email": "string",
  "phone": "string",
  "primaryOutlet": "string",
  "department": "string",
  "role": "string",
  "status": "active|inactive|terminated"
}
```

## Integration Flow for POS
1. Staff enters mobile number on POS login
2. Call `/employees/by-mobile/{mobile}` to validate
3. Check if employee.status === 'active'
4. If valid, allow POS access and track all sales under employee code
5. Log all actions with employee ID, timestamp, outlet

## Security Notes
- Never expose API key in frontend code
- Use server-side proxy for all API calls
- Store employee session securely
