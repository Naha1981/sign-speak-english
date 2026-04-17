import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/hooks/use-auth';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

const MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024;

function getSafeExtension(file: File) {
  const extension = file.name.split('.').pop()?.trim().toLowerCase();
  return extension || 'mp4';
}

async function getVideoDuration(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        resolve(Number.isFinite(video.duration) ? video.duration : 0);
      };
      video.onerror = () => reject(new Error('Could not read the selected video file.'));
      video.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const Route = createFileRoute('/upload')({
  head: () => ({
    meta: [
      { title: 'Upload Video — SASL Read' },
      { name: 'description', content: 'Upload a new SASL video lesson' },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const { user, role, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 1-3');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate({ to: '/' });
    }
  }, [user, role, authLoading, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = e.target.files?.[0] ?? null;

    if (!nextFile) {
      setFile(null);
      setFileError(null);
      return;
    }

    if (!nextFile.type.startsWith('video/')) {
      setFile(null);
      setFileError('Please choose a valid video file.');
      return;
    }

    if (nextFile.size > MAX_UPLOAD_SIZE_BYTES) {
      setFile(null);
      setFileError('This video is too large. Please upload a file under 500 MB.');
      return;
    }

    setFile(nextFile);
    setFileError(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || uploading) return;

    if (!title.trim()) {
      toast.error('Please enter a lesson title.');
      return;
    }

    if (fileError) {
      toast.error(fileError);
      return;
    }

    setUploading(true);
    try {
      const durationSec = await getVideoDuration(file);

      // 1. Upload video to Supabase Storage
      const fileExt = getSafeExtension(file);
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          contentType: file.type || 'video/mp4',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Unable to get public video URL');
      }

      // 2. Insert video record directly via Supabase
      const { data: videoRecord, error: videoError } = await supabase
        .from('videos')
        .insert({
          title: title.trim(),
          grade_level: gradeLevel,
          language: 'SASL',
          status: 'draft',
          video_url: urlData.publicUrl,
          created_by: user.id,
          thumbnail_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (videoError) {
        throw new Error(`Failed to create video record: ${videoError.message}`);
      }

      // 3. Create lesson record
      const { data: lesson, error: lessonError } = await supabase
        .from('lessons')
        .insert({
          video_id: videoRecord.id,
          title: title.trim(),
          created_by: user.id,
        })
        .select()
        .single();

      if (lessonError) {
        throw new Error(`Failed to create lesson: ${lessonError.message}`);
      }

      console.info('[Upload] Created lesson', {
        lessonId: lesson.id,
        videoId: videoRecord.id,
        durationSec,
      });

      toast.success('Video uploaded! Redirecting to lesson editor...');
      navigate({ to: '/editor/$lessonId', params: { lessonId: lesson.id } });
    } catch (err) {
      console.error('[Upload] Error:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} role={role} onSignOut={signOut} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Upload SASL Video</h1>
        <p className="mt-2 text-lg text-muted-foreground">Add a new sign language video to create lessons from</p>

        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Video Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-base font-semibold">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Greetings in SASL"
                  required
                  className="h-12 text-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Grade Level</Label>
                <Select value={gradeLevel} onValueChange={setGradeLevel}>
                  <SelectTrigger className="h-12 text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Grade 1-3">Grade 1–3</SelectItem>
                    <SelectItem value="Grade 4-6">Grade 4–6</SelectItem>
                    <SelectItem value="Grade 7-9">Grade 7–9</SelectItem>
                    <SelectItem value="Grade 10-12">Grade 10–12</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Language</Label>
                <Input value="SASL" disabled className="h-12 text-lg bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="video" className="text-base font-semibold">Video File</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  required
                  className="h-12 text-lg file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-base file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="text-sm text-muted-foreground">Supports MP4, WebM, MOV, AVI and other video formats.</p>
                {fileError && <p className="text-sm font-medium text-destructive">{fileError}</p>}
              </div>

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-semibold" disabled={uploading || !file || !!fileError}>
                {uploading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
                )}
                {uploading ? 'Uploading...' : 'Upload & Create Lesson'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
