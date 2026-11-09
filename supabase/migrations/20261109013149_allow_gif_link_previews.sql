-- Standard link previews sometimes advertise a GIF. The extractor still
-- enforces the existing two-megabyte bucket limit and checks the file header.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'thumbnails';
