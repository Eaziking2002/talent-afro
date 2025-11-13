-- Create storage bucket for profile videos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-videos',
  'profile-videos',
  true,
  10485760, -- 10MB limit
  array['video/mp4', 'video/quicktime', 'video/webm']
);

-- Storage policies for profile videos
create policy "Anyone can view profile videos"
  on storage.objects for select
  using (bucket_id = 'profile-videos');

create policy "Users can upload their own profile videos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-videos' 
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their own profile videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own profile videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );