alter table public.norwyn_customer_offer_events
  drop constraint if exists norwyn_customer_offer_events_type_chk;

alter table public.norwyn_customer_offer_events
  add constraint norwyn_customer_offer_events_type_chk check (event_type in (
    'ELIGIBLE',
    'EXCLUDED',
    'APPROVED',
    'SENT',
    'DELIVERED',
    'OPENED',
    'CLICKED',
    'UNSUBSCRIBED',
    'BOUNCED',
    'LANDING_VIEW',
    'CHECKOUT',
    'PURCHASE',
    'REFUND',
    'EXITED',
    'BLOCKED',
    'NOT_INSTRUMENTED',
    'ENTERED_JOURNEY',
    'EMAIL_SENT',
    'EMAIL_DELIVERED',
    'EMAIL_OPEN',
    'LINK_CLICK',
    'WHATSAPP_SENT',
    'EXITED_JOURNEY',
    'MANUAL_CONTACT'
  ));
