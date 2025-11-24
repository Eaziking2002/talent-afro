-- Create contract templates table
CREATE TABLE contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  default_terms TEXT,
  default_duration_days INTEGER,
  default_currency TEXT DEFAULT 'USD',
  milestones JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Employers can view their own templates"
ON contract_templates FOR SELECT
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = employer_id));

CREATE POLICY "Employers can create templates"
ON contract_templates FOR INSERT
WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = employer_id));

CREATE POLICY "Employers can update their templates"
ON contract_templates FOR UPDATE
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = employer_id));

CREATE POLICY "Employers can delete their templates"
ON contract_templates FOR DELETE
USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = employer_id));

-- Add response time tracking to contract_messages
ALTER TABLE contract_messages
ADD COLUMN response_time_minutes INTEGER;

-- Add renewal tracking to contracts
ALTER TABLE contracts
ADD COLUMN parent_contract_id UUID REFERENCES contracts(id),
ADD COLUMN is_renewal BOOLEAN DEFAULT false;

-- Add indexes
CREATE INDEX idx_contract_templates_employer ON contract_templates(employer_id);
CREATE INDEX idx_contracts_parent ON contracts(parent_contract_id);
CREATE INDEX idx_message_response_time ON contract_messages(response_time_minutes) WHERE response_time_minutes IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_contract_templates_updated_at
BEFORE UPDATE ON contract_templates
FOR EACH ROW
EXECUTE FUNCTION handle_updated_at();