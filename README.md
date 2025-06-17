# Floosak Payment API Client - @alsharie/floosak

A modern, fully-typed TypeScript client for the [Floosak Online Payment API]. This package simplifies the integration process by providing a clean, promise-based interface for all API endpoints described in the official documentation.


## Installation

```bash
npm install @alsharie/floosak
```

## Usage

### 1. Initialization

First, import and initialize the `FloosakClient`. You will need your credentials from QualityConnect.

```typescript
import { FloosakClient } from '@alsharie/floosak';

const client = new FloosakClient({
  baseUrl: 'https://api.your-floosak-provider.com', // Replace with the actual API base URL
  phone: '967705111013',      // Your merchant phone number
  shortCode: '777715',        // Your merchant short code
});
```

### 2. Authentication

Authentication is a two-step process. The token is valid for one year, so you should **store it securely** and reuse it.

```typescript
import { FloosakClient } from '@alsharie/floosak';

// The OTP will be sent to your merchant phone via SMS
const getOtpFromUser = async (): Promise<string> => {
  // In a real app, you would prompt the user to enter the OTP
  // For this example, we'll hardcode it.
  return '123456';
};

const authenticate = async (client: FloosakClient) => {
  try {
    // Step 1: Request an authentication key
    const { request_id } = await client.requestAuthKey();
    console.log(`Authentication requested. Request ID: ${request_id}`);

    // Step 2: Get the OTP from the user and verify
    const otp = await getOtpFromUser();
    const authResponse = await client.verifyAuthKey({ request_id, otp });
    
    console.log('Authentication successful!');
    
    // --> IMPORTANT: Securely store this token! <--
    const token = authResponse.key; 
    console.log('Your new token is:', token);
    
    // You can also get it directly from the client instance
    // const token = client.getToken();
    
    return token;
  } catch (error) {
    console.error('Authentication failed:', error.response?.data || error.message);
  }
};

// Run the authentication
// authenticate(client);
```

#### Reusing a Token

To avoid authenticating every time, initialize the client with your stored token.

```typescript
const storedToken = 'eyJ0eX...'; // Load your saved token

const client = new FloosakClient({
  baseUrl: 'https://api.your-floosak-provider.com',
  phone: '967705111013',
  shortCode: '777715',
  token: storedToken, // Provide the existing token
});

// Now you can directly make payment requests without re-authenticating.
```

### 3. Making a Payment (P2MCL)

Making a payment is also a two-step process involving the merchant and the customer.

1.  **Purchase Request**: The merchant initiates the transaction. This sends an OTP to the **customer's phone**.
2.  **Purchase Confirm**: The merchant uses the customer's OTP to confirm and complete the payment.

```typescript
import { v4 as uuidv4 } from 'uuid'; // A good way to generate unique request IDs

const makePayment = async (client: FloosakClient) => {
  try {
    // You must be authenticated first
    if (!client.getToken()) {
        console.log("Please authenticate first.");
        // await authenticate(client); // Uncomment to run auth
        return;
    }
  
    // Step 1: Initiate the purchase request
    const purchaseDetails = {
      source_wallet_id: 144, // Your wallet ID (from verifyAuthKey response)
      request_id: uuidv4(),  // A unique ID for this specific request
      target_phone: '967777841622', // Customer's phone number
      amount: 100,
      purpose: 'Payment for order #XYZ-123',
    };
    
    const requestResponse = await client.purchaseRequest(purchaseDetails);
    const purchaseId = requestResponse.data.id;
    console.log(`Purchase request sent. Awaiting confirmation for purchase ID: ${purchaseId}`);

    // Step 2: Get the OTP from the customer and confirm the payment
    const customerOtp = 123456; // In a real app, you would prompt the customer to enter this OTP
    
    const confirmResponse = await client.purchaseConfirm({
      purchase_id: purchaseId,
      otp: customerOtp,
    });
    
    console.log('Payment successful!');
    console.log('Transaction Details:', confirmResponse.data);

  } catch (error) {
    console.error('Payment failed:', error.response?.data || error.message);
  }
};

// makePayment(client);
```

### 4. Refunding a Transaction

You can refund a completed transaction using its `transaction_id` (which is the `id` from a successful `purchaseConfirm` response).

```typescript
import { v4 as uuidv4 } from 'uuid';

const refundPayment = async (client: FloosakClient, transactionId: number) => {
    try {
        const refundDetails = {
            transaction_id: transactionId,
            request_id: uuidv4(), // A new unique ID for the refund request
            amount: 100, // Can be a partial or full amount
        };

        const refundResponse = await client.refund(refundDetails);
        console.log('Refund processed successfully:', refundResponse);

    } catch (error) {
        console.error('Refund failed:', error.response?.data || error.message);
    }
}

// Example: refunding transaction with ID 267316
// refundPayment(client, 267316);
```

## API

See `src/types.ts` for a full definition of all request payloads and response objects. The main methods on the `FloosakClient` are:

-   `requestAuthKey()`
-   `verifyAuthKey(payload)`
-   `purchaseRequest(payload)`
-   `purchaseConfirm(payload)`
-   `refund(payload)`
-   `getToken()`

