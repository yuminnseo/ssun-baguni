alter table public.items
add column if not exists purchase_time text;

update public.items
set purchase_time = 'AM 11:00'
where purchase_time is null;
