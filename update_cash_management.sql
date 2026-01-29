-- =============================================
-- UPDATE CASH MANAGEMENT LOGIC
-- Run this in Supabase SQL Editor
-- =============================================

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
  if p_type = 'payment' then
    -- Student pays Shop
    select balance into v_sender_balance from profiles where id = p_sender_id;
    if v_sender_balance < p_amount then
      return json_build_object('success', false, 'message', 'ยอดเงินไม่พอ');
    end if;
    
    update profiles set balance = balance - p_amount where id = p_sender_id;
    update profiles set balance = balance + p_amount where id = p_receiver_id;
    
  elsif p_type = 'topup' then
    -- Staff adds money to Student (Staff receives Cash)
    -- 1. Credit Student
    update profiles set balance = balance + p_amount where id = p_receiver_id;
    
    -- 2. Credit Staff (Record Cash on Hand)
    -- Sender is Staff in this case
    update profiles set balance = balance + p_amount where id = p_sender_id;
    
  elsif p_type = 'refund' then
    -- Student returns money (Staff pays Cash out)
    -- 1. Debit Student
    select balance into v_sender_balance from profiles where id = p_sender_id; -- Student
    if v_sender_balance < p_amount then
      return json_build_object('success', false, 'message', 'ยอดเงินนักเรียนไม่พอคืน');
    end if;
    
    update profiles set balance = balance - p_amount where id = p_sender_id; -- Student
    
    -- 2. Debit Staff (Reduce Cash on Hand)
    -- Receiver is Staff in this case
    update profiles set balance = balance - p_amount where id = p_receiver_id; -- Staff
    
  end if;

  -- Record transaction
  insert into transactions (sender_id, receiver_id, amount, type)
  values (p_sender_id, p_receiver_id, p_amount, p_type);

  return json_build_object('success', true);
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
