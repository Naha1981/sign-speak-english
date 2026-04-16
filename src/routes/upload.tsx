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

  useEffect(() => {
    if (!authLoading && (!user || role !== 'admin')) {
      navigate({ to: '/' });
    }
  }, [user, role, authLoading, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file || uploading) return;

    setUploading(true);
    try {
      // 1. Upload video to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file);

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
          title,
          grade_level: gradeLevel,
          language: 'SASL',
          status: 'draft',
          video_url: urlData.publicUrl,
          created_by: user.id,
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
          title,
          created_by: user.id,
        })
        .select()
        .single();

      if (lessonError) {
        throw new Error(`Failed to create lesson: ${lessonError.message}`);
      }

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
                <Label htmlFor="video" className="text-base font-semibold">Video File (MP4)</Label>
                <Input
                  id="video"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  onChange={handleFileChange}
                  required
                  className="h-12 text-lg file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-base file:font-semibold file:text-primary-foreground hover:file:bg-primary/90"
                />
                <p className="text-sm text-muted-foreground">WebM is not supported — please use MP4.</p>
              </div>

              <Button type="submit" size="lg" className="w-full h-14 text-lg font-semibold" disabled={uploading || !file}>
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
