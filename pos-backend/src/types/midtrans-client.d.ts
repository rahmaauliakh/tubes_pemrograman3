declare module "midtrans-client" {
  export type SnapConfig = {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  };

  export type SnapItemDetail = {
    id: string;
    price: number;
    quantity: number;
    name: string;
  };

  export type SnapTransactionParameter = {
    transaction_details: {
      order_id: string;
      gross_amount: number;
    };
    item_details: SnapItemDetail[];
    customer_details?: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
    };
  };

  export type SnapTransactionResponse = {
    token: string;
    redirect_url: string;
  };

  export class Snap {
    constructor(config: SnapConfig);
    createTransaction(
      parameter: SnapTransactionParameter
    ): Promise<SnapTransactionResponse>;
  }

  const midtransClient: {
    Snap: typeof Snap;
  };

  export default midtransClient;
}
