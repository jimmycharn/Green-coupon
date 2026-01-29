-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  role text not null check (role in ('student', 'shop', 'staff', 'admin')),
  full_name text,
  student_id text,
  balance numeric default 0 check (balance >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Create transactions table
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references public.profiles(id),
  receiver_id uuid references public.profiles(id),
  amount numeric not null check (amount > 0),
  type text not null check (type in ('topup', 'payment', 'refund')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on transactions
alter table public.transactions enable row level security;

-- RLS Policies for Profiles
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- RLS Policies for Transactions
create policy "Users can view their own transactions"
  on transactions for select
  using ( auth.uid() = sender_id or auth.uid() = receiver_id );

-- Function to handle transfers (Top-up, Payment, Refund)
create or replace function transfer_funds(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_amount numeric,
  p_type text
) returns json as $$
declare
  v_sender_balance numeric;
  v_receiver_balance numeric;
begin
  -- Check if sender has enough balance (only for payment and refund)
  -- Top-up comes from 'external' cash, so we don't deduct from staff balance in this simple model,
  -- OR we can assume Staff has infinite 'source' or we just credit the student.
  -- Let's refine the logic:
  -- 'topup': Credit Receiver (Student), Sender (Staff) is just the operator.
  -- 'payment': Debit Sender (Student), Credit Receiver (Shop).
  -- 'refund': Debit Sender (Student), Credit Receiver (Staff/Cash).
  
  -- However, for a robust system, let's stick to the request:
  -- 1. Top-up: Student gets money.
  -- 2. Payment: Student pays Shop.
  -- 3. Refund: Student returns money to Staff (Cash out).

  if p_type = 'payment' then
    select balance into v_sender_balance from profiles where id = p_sender_id;
    if v_sender_balance < p_amount then
      return json_build_object('success', false, 'message', 'Insufficient balance');
    end if;
    
    update profiles set balance = balance - p_amount where id = p_sender_id;
    update profiles set balance = balance + p_amount where id = p_receiver_id;
    
  elsif p_type = 'topup' then
    -- Staff adds money to Student
    update profiles set balance = balance + p_amount where id = p_receiver_id;
    
  elsif p_type = 'refund' then
    -- Student returns money (Cash out)
    select balance into v_sender_balance from profiles where id = p_sender_id;
    if v_sender_balance < p_amount then
      return json_build_object('success', false, 'message', 'Insufficient balance');
    end if;
    
    update profiles set balance = balance - p_amount where id = p_sender_id;
    -- We don't necessarily add to Staff balance unless we track cash drawer
  end if;

  -- Record transaction
  insert into transactions (sender_id, receiver_id, amount, type)
  values (p_sender_id, p_receiver_id, p_amount, p_type);

  return json_build_object('success', true);
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;

-- =============================================
-- AUTO CREATE PROFILE ON USER SIGNUP
-- =============================================

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    0
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function when a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Policy to allow inserting profiles (for the trigger)
create policy "Enable insert for service role"
  on profiles for insert
  with check (true);

-- Policy for transactions insert (allow authenticated users)
create policy "Authenticated users can create transactions"
  on transactions for insert
  with check (auth.uid() is not null);
