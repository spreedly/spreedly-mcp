export const TOOL_DESCRIPTIONS = Object.freeze({
  // Gateways
  spreedly_gateway_create:
    "Creates a new gateway connection in Spreedly. Requires a gateway_type and optional credentials. Returns the created gateway configuration. This tool ONLY creates gateways and does not process payments. Before creating a new gateway, use spreedly_gateway_list to check if one already exists for your gateway type.",
  spreedly_gateway_list:
    "Lists all gateway connections configured in your Spreedly environment. Returns an array of gateway summaries. This tool ONLY reads data and does not modify anything.",
  spreedly_gateway_show:
    "Retrieves details of a single gateway by its token. Returns the full gateway configuration. This tool ONLY reads data and does not modify anything.",
  spreedly_gateway_update:
    "Updates an existing gateway's configuration. Requires a gateway_token and fields to update. Returns the updated gateway. This tool ONLY modifies the specified gateway.",
  spreedly_gateway_redact:
    "Permanently removes sensitive credential data from a gateway while preserving the record. This is irreversible. This tool ONLY affects the specified gateway.",
  spreedly_gateway_retain:
    "Marks a gateway to be retained beyond the default retention period. Returns the updated gateway. This tool ONLY modifies retention status.",
  spreedly_gateway_list_supported:
    "Lists all gateway types supported by Spreedly. Returns available gateway integrations and their capabilities. This tool ONLY reads reference data.",
  spreedly_gateway_list_transactions:
    "Lists transactions processed through a specific gateway. Returns transaction summaries. This tool ONLY reads data.",
  spreedly_gateway_authorize:
    "Authorizes a payment method against a specific gateway without capturing funds. Returns the transaction result. This tool creates an authorization hold.",
  spreedly_gateway_purchase:
    "Authorizes and captures a payment in a single step against a specific gateway. Returns the transaction result. This tool processes a payment.",
  spreedly_gateway_verify:
    "Verifies a payment method against a gateway without charging it. Returns the verification result. This tool ONLY verifies, it does not charge.",
  spreedly_gateway_store:
    "Stores a payment method at a gateway for later use. Returns the storage transaction. This tool ONLY stores, it does not charge.",
  spreedly_gateway_general_credit:
    "Issues a credit to a payment method through a gateway without a prior purchase. Returns the credit transaction. This tool creates a credit.",

  // Transactions
  spreedly_transaction_list:
    "Lists transactions in your Spreedly environment. Returns transaction summaries with pagination. This tool ONLY reads data.",
  spreedly_transaction_show:
    "Retrieves details of a single transaction by its token. Returns the full transaction record. This tool ONLY reads data.",
  spreedly_transaction_update:
    "Updates metadata on an existing transaction. Requires a transaction_token. This tool ONLY modifies transaction metadata.",
  spreedly_transaction_capture:
    "Captures a previously authorized transaction, fully or partially. Requires a transaction_token. This tool captures funds.",
  spreedly_transaction_void:
    "Voids a previously authorized or captured transaction. Requires a transaction_token. This is irreversible.",
  spreedly_transaction_credit:
    "Refunds a previously captured transaction, fully or partially. Requires a transaction_token. This tool issues a refund.",
  spreedly_transaction_complete:
    "Completes a pending transaction that required further action. Requires a transaction_token.",
  spreedly_transaction_confirm:
    "Confirms a pending transaction. Requires a transaction_token.",
  spreedly_transaction_transcript:
    "Retrieves the raw gateway communication transcript for a transaction. Returns request/response logs. This tool ONLY reads data.",
  spreedly_transaction_authorize_workflow:
    "Creates an authorization using Spreedly workflows (route-agnostic). Returns the transaction result.",
  spreedly_transaction_purchase_workflow:
    "Creates a purchase using Spreedly workflows (route-agnostic). Returns the transaction result.",
  spreedly_transaction_verify_workflow:
    "Verifies a payment method using Spreedly workflows (route-agnostic). Returns the verification result.",

  // Payment Methods
  spreedly_payment_method_create:
    "Creates/tokenizes a new payment method in Spreedly. Returns the payment method token and details. This tool ONLY tokenizes, it does not charge.",
  spreedly_payment_method_list:
    "Lists payment methods in your Spreedly environment. Returns payment method summaries. This tool ONLY reads data.",
  spreedly_payment_method_show:
    "Retrieves details of a single payment method by its token. This tool ONLY reads data.",
  spreedly_payment_method_update:
    "Updates a payment method's non-sensitive fields. Requires a payment_method_token. This tool ONLY updates metadata.",
  spreedly_payment_method_retain:
    "Marks a payment method to be retained beyond the default retention period. This tool ONLY modifies retention status.",
  spreedly_payment_method_redact:
    "Permanently removes sensitive data from a payment method. This is irreversible.",
  spreedly_payment_method_recache:
    "Recaches the CVV for a previously stored payment method. Requires the CVV to be provided again.",
  spreedly_payment_method_list_transactions:
    "Lists transactions for a specific payment method. This tool ONLY reads data.",
  spreedly_payment_method_list_events:
    "Lists lifecycle events for a specific payment method. This tool ONLY reads data.",
  spreedly_payment_method_delete_metadata:
    "Deletes custom metadata from a payment method. This tool ONLY removes metadata.",
  spreedly_payment_method_update_gratis:
    "Updates a managed payment method's details without a gateway interaction. This tool modifies payment method data.",
  spreedly_payment_method_show_event:
    "Retrieves a specific payment method event by token. This tool ONLY reads data.",
  spreedly_payment_method_list_all_events:
    "Lists all payment method events across your environment. This tool ONLY reads data.",

  // Receivers
  spreedly_receiver_list_supported:
    "Lists all receiver types supported by Spreedly. Returns available receiver integrations. This tool ONLY reads reference data.",
  spreedly_receiver_create:
    "Creates a new payment receiver in Spreedly. Returns the receiver configuration. This tool ONLY creates receivers.",
  spreedly_receiver_list:
    "Lists all receivers in your Spreedly environment. This tool ONLY reads data.",
  spreedly_receiver_show:
    "Retrieves details of a single receiver by its token. This tool ONLY reads data.",
  spreedly_receiver_update:
    "Updates an existing receiver's configuration. This tool ONLY modifies the specified receiver.",
  spreedly_receiver_redact:
    "Permanently removes sensitive data from a receiver. This is irreversible.",
  spreedly_receiver_deliver:
    "Delivers a payment method to a receiver endpoint. This tool transmits payment data to the receiver.",
  spreedly_receiver_export:
    "Exports payment methods to a receiver. This tool transmits payment data to the receiver.",

  // Certificates
  spreedly_certificate_create:
    "Creates a new certificate in Spreedly for Apple Pay or similar integrations. This tool ONLY creates certificates.",
  spreedly_certificate_generate:
    "Generates a new certificate signing request. This tool ONLY generates CSRs.",
  spreedly_certificate_list:
    "Lists all certificates in your Spreedly environment. This tool ONLY reads data.",
  spreedly_certificate_update:
    "Updates an existing certificate. This tool ONLY modifies the specified certificate.",

  // Environments
  spreedly_environment_create:
    "Creates a new Spreedly environment. Returns the environment configuration. This tool ONLY creates environments.",
  spreedly_environment_list:
    "Lists all environments in your Spreedly organization. This tool ONLY reads data.",
  spreedly_environment_show:
    "Retrieves details of a single environment by its key. This tool ONLY reads data.",
  spreedly_environment_update:
    "Updates an existing environment's configuration. This tool ONLY modifies the specified environment.",
  spreedly_environment_create_access_secret:
    "Creates a new access secret for an environment. Returns the secret (shown only once). This tool creates credentials.",
  spreedly_environment_list_access_secrets:
    "Lists access secrets for an environment. Secret values are not returned. This tool ONLY reads data.",
  spreedly_environment_show_access_secret:
    "Retrieves details of a specific access secret. The secret value is not returned. This tool ONLY reads data.",
  spreedly_environment_delete_access_secret:
    "Deletes an access secret from an environment. This is irreversible.",
  spreedly_environment_regenerate_signing_secret:
    "Regenerates the signing secret for an environment. The old secret becomes invalid immediately.",

  // Merchant Profiles
  spreedly_merchant_profile_create:
    "Creates a new merchant profile. Returns the profile configuration. This tool ONLY creates profiles.",
  spreedly_merchant_profile_list:
    "Lists all merchant profiles. This tool ONLY reads data.",
  spreedly_merchant_profile_show:
    "Retrieves details of a single merchant profile. This tool ONLY reads data.",
  spreedly_merchant_profile_update:
    "Updates an existing merchant profile. This tool ONLY modifies the specified profile.",

  // Sub Merchants
  spreedly_sub_merchant_create:
    "Creates a new sub-merchant. Returns the sub-merchant configuration. This tool ONLY creates sub-merchants.",
  spreedly_sub_merchant_list:
    "Lists all sub-merchants. This tool ONLY reads data.",
  spreedly_sub_merchant_show:
    "Retrieves details of a single sub-merchant. This tool ONLY reads data.",
  spreedly_sub_merchant_update:
    "Updates an existing sub-merchant. This tool ONLY modifies the specified sub-merchant.",

  // Events
  spreedly_event_list:
    "Lists events in your Spreedly environment with pagination. Returns event summaries. This tool ONLY reads data.",
  spreedly_event_show:
    "Retrieves details of a single event by its ID. Returns the full event record. This tool ONLY reads data.",

  // Protection
  spreedly_protection_forward_claim:
    "Forwards a chargeback claim to the protection provider. This tool submits claim data.",
  spreedly_protection_list_events:
    "Lists protection events. Returns event summaries. This tool ONLY reads data.",
  spreedly_protection_show_event:
    "Retrieves a specific protection event. This tool ONLY reads data.",
  spreedly_protection_create_provider:
    "Creates a new protection provider on a merchant profile. This tool ONLY creates providers.",
  spreedly_protection_show_provider:
    "Retrieves details of a protection provider. This tool ONLY reads data.",

  // SCA
  spreedly_sca_authenticate:
    "Authenticates a payment method via an SCA provider for 3D Secure flows. Returns authentication data.",
  spreedly_sca_create_provider:
    "Creates a new SCA provider on a merchant profile. This tool ONLY creates providers.",
  spreedly_sca_show_provider:
    "Retrieves details of an SCA provider. This tool ONLY reads data.",

  // Card Refresher
  spreedly_card_refresher_inquiry:
    "Submits a card refresher inquiry to check for updated card details. This tool initiates an inquiry.",
  spreedly_card_refresher_show_inquiry:
    "Retrieves details of a specific card refresher inquiry. This tool ONLY reads data.",
  spreedly_card_refresher_list_inquiries:
    "Lists card refresher inquiries. This tool ONLY reads data.",

  // Network Tokenization
  spreedly_network_tokenization_card_metadata:
    "Retrieves card metadata for a network token. This tool ONLY reads data.",
  spreedly_network_tokenization_token_status:
    "Retrieves the status of a network token. This tool ONLY reads data.",

  // Payment (show)
  spreedly_payment_show:
    "Retrieves details of a payment by its token. This tool ONLY reads data.",
} as const);
