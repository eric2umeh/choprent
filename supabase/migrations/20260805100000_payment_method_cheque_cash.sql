-- Allow cheque + tenant-submitted cash as distinct payment methods.
-- cash_recorded remains staff office cash (verified immediately).

alter type payment_method add value if not exists 'cheque';
alter type payment_method add value if not exists 'cash';
