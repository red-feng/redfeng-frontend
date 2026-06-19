with expected_columns(table_schema, table_name, column_name) as (
  values
    ('public', 'bookings', 'fulfillment_mode'),
    ('public', 'bookings', 'supplier_id'),
    ('public', 'bookings', 'supplier_booking_reference'),
    ('public', 'bookings', 'supplier_order_status'),
    ('public', 'bookings', 'redfeng_profit_source'),
    ('public', 'bookings', 'supplier_net_cost_amount'),
    ('public', 'bookings', 'redfeng_spread_amount'),
    ('public', 'bookings', 'redfeng_recorded_profit_amount'),
    ('public', 'supplier_orders', 'booking_id'),
    ('public', 'supplier_orders', 'supplier_id'),
    ('public', 'supplier_orders', 'product_type'),
    ('public', 'supplier_orders', 'supplier_order_id'),
    ('public', 'supplier_orders', 'supplier_reference'),
    ('public', 'supplier_orders', 'supplier_status'),
    ('public', 'supplier_orders', 'submission_mode'),
    ('public', 'supplier_orders', 'request_payload'),
    ('public', 'supplier_orders', 'response_payload'),
    ('public', 'supplier_orders', 'supplier_cost_amount'),
    ('public', 'supplier_orders', 'supplier_cost_currency'),
    ('public', 'supplier_orders', 'supplier_cost_recorded_at'),
    ('public', 'flight_booking_details', 'booking_id'),
    ('public', 'flight_booking_details', 'supplier_order_id'),
    ('public', 'flight_booking_details', 'airline_code'),
    ('public', 'flight_booking_details', 'airline_name'),
    ('public', 'flight_booking_details', 'flight_number'),
    ('public', 'flight_booking_details', 'origin_airport_code'),
    ('public', 'flight_booking_details', 'origin_airport_name'),
    ('public', 'flight_booking_details', 'destination_airport_code'),
    ('public', 'flight_booking_details', 'destination_airport_name'),
    ('public', 'flight_booking_details', 'departure_at'),
    ('public', 'flight_booking_details', 'arrival_at'),
    ('public', 'flight_booking_details', 'return_at'),
    ('public', 'flight_booking_details', 'cabin_class'),
    ('public', 'flight_booking_details', 'trip_type'),
    ('public', 'flight_booking_details', 'passenger_count'),
    ('public', 'flight_booking_details', 'pnr_code'),
    ('public', 'flight_booking_details', 'ticket_number'),
    ('public', 'flight_booking_details', 'issue_status'),
    ('public', 'flight_booking_details', 'lifecycle_status'),
    ('public', 'flight_booking_details', 'fare_reference_id'),
    ('public', 'flight_booking_details', 'fare_rechecked_at'),
    ('public', 'flight_booking_details', 'booking_hold_expires_at'),
    ('public', 'flight_booking_details', 'issue_requested_at'),
    ('public', 'flight_booking_details', 'issued_at'),
    ('public', 'flight_booking_details', 'issue_failed_at'),
    ('public', 'flight_booking_details', 'customer_notified_at'),
    ('public', 'flight_booking_details', 'supplier_raw_reference')
)
select
  expected.table_name,
  expected.column_name,
  case when columns.column_name is null then 'missing' else 'ok' end as status
from expected_columns expected
left join information_schema.columns columns
  on columns.table_schema = expected.table_schema
 and columns.table_name = expected.table_name
 and columns.column_name = expected.column_name
where columns.column_name is null
order by expected.table_name, expected.column_name;
