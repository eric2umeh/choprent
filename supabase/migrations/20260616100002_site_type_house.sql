-- Allow standalone houses as a landlord property type
alter type site_type add value if not exists 'house';
