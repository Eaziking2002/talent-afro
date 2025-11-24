-- Create verification_requests table for talent verification
CREATE TABLE public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_id UUID NOT NULL REFERENCES public.profiles(id),
  request_type TEXT NOT NULL, -- 'identity', 'skill', 'portfolio', 'blue_tick'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  verification_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  documents JSONB DEFAULT '[]'::jsonb,
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create verification_badges table
CREATE TABLE public.verification_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  talent_id UUID NOT NULL REFERENCES public.profiles(id),
  badge_type TEXT NOT NULL, -- 'identity', 'skill', 'portfolio', 'blue_tick'
  badge_level TEXT, -- 'bronze', 'silver', 'gold', 'platinum'
  issued_by UUID NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(talent_id, badge_type)
);

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID REFERENCES public.contracts(id),
  application_id UUID REFERENCES public.applications(id),
  participant_ids UUID[] NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'direct', -- 'direct', 'contract', 'support'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message_text TEXT,
  message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'file', 'system'
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  reactions JSONB DEFAULT '{}'::jsonb,
  replied_to UUID REFERENCES public.chat_messages(id),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create typing_indicators table
CREATE TABLE public.typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Create analytics_snapshots table for historical tracking
CREATE TABLE public.analytics_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  metric_type TEXT NOT NULL, -- 'revenue', 'contracts', 'users', 'satisfaction'
  metric_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(snapshot_date, metric_type)
);

-- Enable RLS on all tables
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification_requests
CREATE POLICY "Talents can view their own verification requests"
ON public.verification_requests
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = verification_requests.talent_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Talents can create verification requests"
ON public.verification_requests
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = verification_requests.talent_id AND profiles.user_id = auth.uid())
);

CREATE POLICY "Admins can manage all verification requests"
ON public.verification_requests
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for verification_badges
CREATE POLICY "Everyone can view verification badges"
ON public.verification_badges
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage verification badges"
ON public.verification_badges
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for chat_rooms
CREATE POLICY "Users can view their chat rooms"
ON public.chat_rooms
FOR SELECT
USING (auth.uid() = ANY(participant_ids) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create chat rooms"
ON public.chat_rooms
FOR INSERT
WITH CHECK (auth.uid() = ANY(participant_ids));

-- RLS policies for chat_messages
CREATE POLICY "Chat participants can view messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = chat_messages.room_id 
    AND (auth.uid() = ANY(chat_rooms.participant_ids) OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Chat participants can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = chat_messages.room_id 
    AND auth.uid() = ANY(chat_rooms.participant_ids)
  ) AND auth.uid() = sender_id
);

CREATE POLICY "Users can update their own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = sender_id);

-- RLS policies for typing_indicators
CREATE POLICY "Chat participants can manage typing indicators"
ON public.typing_indicators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = typing_indicators.room_id 
    AND auth.uid() = ANY(chat_rooms.participant_ids)
  )
);

-- RLS policies for analytics_snapshots
CREATE POLICY "Admins can manage analytics snapshots"
ON public.analytics_snapshots
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to automatically release escrow when deliverable is approved
CREATE OR REPLACE FUNCTION auto_release_escrow_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract RECORD;
  v_milestone RECORD;
  v_total_milestone_amount BIGINT;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get milestone details
    SELECT * INTO v_milestone
    FROM milestones
    WHERE id = NEW.milestone_id;
    
    -- Get contract details
    SELECT * INTO v_contract
    FROM contracts
    WHERE id = v_milestone.contract_id;
    
    -- Update milestone status
    UPDATE milestones
    SET status = 'approved'
    WHERE id = v_milestone.id;
    
    -- Create release transaction
    INSERT INTO transactions (
      type,
      status,
      from_user_id,
      to_user_id,
      job_id,
      amount_minor_units,
      currency,
      description,
      payment_metadata
    ) VALUES (
      'release',
      'completed',
      v_contract.employer_id,
      v_contract.talent_id,
      v_contract.job_id,
      v_milestone.amount_minor_units,
      v_contract.currency,
      'Automatic escrow release: ' || v_milestone.title,
      jsonb_build_object(
        'milestone_id', v_milestone.id,
        'deliverable_id', NEW.id,
        'auto_released', true
      )
    );
    
    -- Update talent's wallet
    INSERT INTO wallets (user_id, balance_minor_units, currency)
    VALUES (v_contract.talent_id, v_milestone.amount_minor_units, v_contract.currency)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance_minor_units = wallets.balance_minor_units + v_milestone.amount_minor_units,
      updated_at = now();
    
    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      description,
      related_id,
      related_type,
      metadata
    ) VALUES (
      v_contract.talent_id,
      'payment',
      'Payment Released',
      'Milestone payment of $' || (v_milestone.amount_minor_units / 100.0) || ' has been released',
      v_milestone.id,
      'milestone',
      jsonb_build_object('amount', v_milestone.amount_minor_units, 'currency', v_contract.currency)
    );
    
    -- Check if all milestones are completed
    SELECT COUNT(*) INTO v_total_milestone_amount
    FROM milestones
    WHERE contract_id = v_contract.id
    AND status NOT IN ('approved', 'completed');
    
    -- If all milestones are done, complete the contract
    IF v_total_milestone_amount = 0 THEN
      UPDATE contracts
      SET status = 'completed'
      WHERE id = v_contract.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto escrow release
CREATE TRIGGER trigger_auto_release_escrow
AFTER UPDATE ON deliverables
FOR EACH ROW
EXECUTE FUNCTION auto_release_escrow_on_approval();

-- Enable realtime for chat tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;

-- Create indexes for performance
CREATE INDEX idx_verification_requests_talent_id ON public.verification_requests(talent_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX idx_verification_badges_talent_id ON public.verification_badges(talent_id);
CREATE INDEX idx_chat_rooms_participants ON public.chat_rooms USING GIN(participant_ids);
CREATE INDEX idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_typing_indicators_room_id ON public.typing_indicators(room_id);
CREATE INDEX idx_analytics_snapshots_date ON public.analytics_snapshots(snapshot_date DESC);