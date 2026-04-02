-- Run this once in Supabase SQL Editor to enable server-side email notifications

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION _send_chat_email_notif()
RETURNS trigger AS $$
DECLARE
  _message text;
  _name text;
BEGIN
  _name := COALESCE(NEW.customer_name, 'უცნობი');

  IF TG_OP = 'INSERT' THEN
    _message := 'ახალი მომხმარებელი შემოვიდა ჩატში: ' || _name;
  ELSIF TG_OP = 'UPDATE' AND COALESCE(NEW.unread, 0) > COALESCE(OLD.unread, 0) THEN
    _message := 'ახალი შეტყობინება ჩატში: ' || _name;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://api.emailjs.com/api/v1.0/email/send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := json_build_object(
      'service_id',   'service_xvv38pk',
      'template_id',  'template_tcqn5lq',
      'user_id',      'pb_XXv8v1r4bDAPMh',
      'template_params', json_build_object(
        'type',    'ჩატი',
        'message', _message,
        'name',    'UniCraft',
        'email',   ''
      )
    )::jsonb
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_chat_notify ON chats;
CREATE TRIGGER on_chat_notify
  AFTER INSERT OR UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION _send_chat_email_notif();
