-- =============================================
-- ADMIN CASH HANDLING FUNCTIONS & UPDATES
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Update Transaction Types Constraint
-- We need to allow new transaction types for Admin actions
DO $$
BEGIN
  -- Drop the old constraint
  ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
  
  -- Add new constraint with expanded types
  ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('topup', 'payment', 'refund', 'cash_collection', 'cash_payout'));
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error updating constraint: %', SQLERRM;
END $$;

-- 2. Create the Admin Handle Cash Function
create or replace function admin_handle_cash(
  target_user_id uuid,
  action_type text -- 'collect_from_staff' or 'pay_shop'
) returns json as $$
declare
  v_admin_id uuid;
  v_target_balance numeric;
  v_admin_balance numeric;
  v_target_name text;
begin
  -- Get current user (Admin)
  v_admin_id := auth.uid();
  
  -- Get target user details
  select balance, full_name into v_target_balance, v_target_name from profiles where id = target_user_id;
  
  if v_target_balance is null then
     return json_build_object('success', false, 'message', 'User not found');
  end if;

  if v_target_balance <= 0 then
    return json_build_object('success', false, 'message', 'No balance to process');
  end if;

  if action_type = 'collect_from_staff' then
    -- 1. Reset Staff balance to 0
    update profiles set balance = 0 where id = target_user_id;
    
    -- 2. Add to Admin balance
    update profiles set balance = balance + v_target_balance where id = v_admin_id;
    
    -- 3. Record Transaction
    insert into transactions (sender_id, receiver_id, amount, type)
    values (target_user_id, v_admin_id, v_target_balance, 'cash_collection');
    
    return json_build_object('success', true, 'amount', v_target_balance, 'message', 'Collected ' || v_target_balance || ' from ' || v_target_name);

  elsif action_type = 'pay_shop' then
    -- 1. Check Admin balance
    select balance into v_admin_balance from profiles where id = v_admin_id;
    
    if v_admin_balance < v_target_balance then
      return json_build_object('success', false, 'message', 'Admin has insufficient funds (' || v_admin_balance || ')');
    end if;
    
    -- 2. Deduct from Admin
    update profiles set balance = balance - v_target_balance where id = v_admin_id;
    
    -- 3. Reset Shop balance (Shop withdraws cash)
    update profiles set balance = 0 where id = target_user_id;
    
    -- 4. Record Transaction
    insert into transactions (sender_id, receiver_id, amount, type)
    values (v_admin_id, target_user_id, v_target_balance, 'cash_payout');
    
    return json_build_object('success', true, 'amount', v_target_balance, 'message', 'Paid ' || v_target_balance || ' to ' || v_target_name);
    
  else
    return json_build_object('success', false, 'message', 'Invalid action type');
  end if;

exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
