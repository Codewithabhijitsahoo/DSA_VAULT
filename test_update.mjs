import { createClient } from '@supabase/supabase-js';

// read manual .env or just hardcode
const SUPABASE_URL = "https://uxmgvddhobgovrbdvllt.supabase.co";
const SUPABASE_KEY = "sb_publishable_d-rxwUwtZQNgjR9M760O1Q_JNzm__9u";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testUpdate() {
  const { data: qData } = await supabase.from('questions').select('id, title').limit(1);
  if (!qData || qData.length === 0) {
    console.log("No questions found.");
    return;
  }
  
  const id = qData[0].id;
  console.log(`Testing update on question ${id} - ${qData[0].title}`);
  
  const { error } = await supabase.from('questions').update({
    ease_factor: 2.6,
    needs_revision: false,
    next_review_at: new Date().toISOString()
  }).eq('id', id);
  
  if (error) {
    console.error("Update failed with:", error);
  } else {
    console.log("Update succeeded!");
  }
}

testUpdate();
