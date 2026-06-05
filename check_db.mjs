import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkColumns() {
  const { data, error } = await supabase.from('questions').select('*').limit(1);
  if (error) {
    console.error('Error fetching questions:', error);
  } else {
    console.log('Question object keys:', data.length > 0 ? Object.keys(data[0]) : 'None found');
  }
}

checkColumns();
