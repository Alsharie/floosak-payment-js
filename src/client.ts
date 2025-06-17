// src/FloosakClient.ts

import axios, { AxiosInstance } from 'axios';
import {
  FloosakClientConfig,
  RequestKeyPayload,
  RequestKeyResponse,
  VerifyKeyPayload,
  VerifyKeyResponse,
  PurchaseRequestPayload,
  TransactionResponse,
  PurchaseConfirmPayload,
  RefundPayload,
  RefundResponse,
} from './types';

export class FloosakClient {
  private readonly axiosInstance: AxiosInstance;
  private token?: string;

  private readonly config: Omit<FloosakClientConfig, 'token'>;

  constructor(config: FloosakClientConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      phone: config.phone,
      shortCode: config.shortCode,
    };

    this.token = config.token;

    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-channel': 'merchant',
      },
    });

    // Use an interceptor to automatically add the Authorization header
    this.axiosInstance.interceptors.request.use((axiosConfig) => {
      if (this.token) {
        axiosConfig.headers.Authorization = `Bearer ${this.token}`;
      }
      return axiosConfig;
    });
  }

  /**
   * Retrieves the current bearer token.
   * @returns The stored token, or undefined if not authenticated.
   */
  public getToken(): string | undefined {
    return this.token;
  }

  /**
   * Step 1 of Authentication: Request a key by providing phone and short code.
   * This will trigger an SMS with an OTP to the merchant's phone.
   * @returns A promise that resolves with the request_id.
   */
  async requestAuthKey(): Promise<RequestKeyResponse> {
    const payload: RequestKeyPayload = {
      phone: this.config.phone,
      short_code: this.config.shortCode,
    };
    const response = await this.axiosInstance.post<RequestKeyResponse>('/api/v1/request/key', payload);
    return response.data;
  }

  /**
   * Step 2 of Authentication: Verify the key using the OTP.
   * On success, the client will store the token for subsequent requests.
   * @param payload - The request ID from step 1 and the OTP.
   * @returns A promise that resolves with the merchant's account details.
   */
  async verifyAuthKey(payload: VerifyKeyPayload): Promise<VerifyKeyResponse> {
    const response = await this.axiosInstance.post<VerifyKeyResponse>('/api/v1/verify/key', payload);
    if (response.data && response.data.key) {
      this.token = response.data.key;
    }
    return response.data;
  }

  /**
   * Initiates a payment request from a customer.
   * This will send an OTP to the customer's phone.
   * @param payload - Details of the purchase request.
   * @returns A promise that resolves with the pending transaction details.
   */
  async purchaseRequest(payload: PurchaseRequestPayload): Promise<TransactionResponse> {
    this.ensureAuthenticated();
    const response = await this.axiosInstance.post<TransactionResponse>('/api/v1/merchant/p2mcl', payload);
    return response.data;
  }

  /**
   * Confirms a payment using the OTP sent to the customer.
   * @param payload - The purchase ID and the customer's OTP.
   * @returns A promise that resolves with the completed transaction details.
   */
  async purchaseConfirm(payload: PurchaseConfirmPayload): Promise<TransactionResponse> {
    this.ensureAuthenticated();
    const response = await this.axiosInstance.post<TransactionResponse>('/api/v1/merchant/p2mcl/confirm', payload);
    return response.data;
  }

  /**
   * Refunds a previously completed transaction.
   * @param payload - The original transaction ID and the amount to refund.
   * @returns A promise that resolves with the refund transaction status.
   */
  async refund(payload: RefundPayload): Promise<RefundResponse> {
    this.ensureAuthenticated();
    const response = await this.axiosInstance.post<RefundResponse>('/api/v1/merchant/p2mcl/refund', payload);
    return response.data;
  }

  private ensureAuthenticated(): void {
    if (!this.token) {
      throw new Error(
          'Client is not authenticated. Please call requestAuthKey() and verifyAuthKey() first, or initialize the client with a valid token.'
      );
    }
  }
}