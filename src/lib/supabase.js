import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fxqprmcjhwvfpmwlapsv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cXBybWNqaHd2ZnBtd2xhcHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NTg4NDYsImV4cCI6MjA4NTIzNDg0Nn0.6439-Fk4DPWO4LjCV2ldhRD9Xuq2qteT8g8ggllq6BM'

export const supabase = createClient(supabaseUrl, supabaseKey)
