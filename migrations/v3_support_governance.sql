-- ============================================================
-- IMOBZY: Support Tickets System
-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ============================================================

-- 1. Create support_tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    user_id UUID REFERENCES profiles(id),
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create support_messages table (replies)
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    message TEXT NOT NULL,
    is_admin_reply BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS for support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own organization tickets" ON support_tickets;
CREATE POLICY "Users can view their own organization tickets" 
ON support_tickets FOR SELECT 
TO authenticated 
USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create tickets for their organization" ON support_tickets;
CREATE POLICY "Users can create tickets for their organization" 
ON support_tickets FOR INSERT 
TO authenticated 
WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "SuperAdmins can view all tickets" ON support_tickets;
CREATE POLICY "SuperAdmins can view all tickets" 
ON support_tickets FOR SELECT 
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "SuperAdmins can update all tickets" ON support_tickets;
CREATE POLICY "SuperAdmins can update all tickets" 
ON support_tickets FOR UPDATE
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

-- 4. RLS for support_messages
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for their tickets" ON support_messages;
CREATE POLICY "Users can view messages for their tickets" 
ON support_messages FOR SELECT 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE id = support_messages.ticket_id 
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "Users can insert messages for their tickets" ON support_messages;
CREATE POLICY "Users can insert messages for their tickets" 
ON support_messages FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE id = support_messages.ticket_id 
    AND organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
));

DROP POLICY IF EXISTS "SuperAdmins can view all messages" ON support_messages;
CREATE POLICY "SuperAdmins can view all messages" 
ON support_messages FOR SELECT 
TO authenticated 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');

DROP POLICY IF EXISTS "SuperAdmins can insert all messages" ON support_messages;
CREATE POLICY "SuperAdmins can insert all messages" 
ON support_messages FOR INSERT 
TO authenticated 
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'superadmin');
