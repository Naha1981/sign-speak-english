import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Save, Loader2, GripVertical, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Segment {
  id?: string;
  start_sec: number;
  end_sec: number;
  sasl_gloss: string;
  english_text: string;
  sort_order: number;
}

interface LessonEditorProps {
  lessonId: string;
  videoUrl: string;
}

export function LessonEditor({ lessonId, videoUrl }: LessonEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    async function loadSegments() {
      const { data } = await supabase
        .from('saslgloss_chunks')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('sort_order');
      if (data) {
        setSegments(data.map(d => ({
          id: d.id,
          start_sec: Number(d.start_sec),
          end_sec: Number(d.end_sec),
          sasl_gloss: d.sasl_gloss ?? '',
          english_text: d.english_text,
          sort_order: d.sort_order,
        })));
      }
    }
    loadSegments();
  }, [lessonId]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  }, []);

  const addSegment = () => {
    setSegments(prev => [
      ...prev,
      {
        start_sec: currentTime,
        end_sec: Math.min(currentTime + 3, duration || currentTime + 3),
        sasl_gloss: '',
        english_text: '',
        sort_order: prev.length,
      }
    ]);
  };

  const updateSegment = (index: number, field: keyof Segment, value: string | number) => {
    setSegments(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSegment = (index: number) => {
    setSegments(prev => prev.filter((_, i) => i !== index));
  };

  const moveSegment = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= segments.length) return;
    setSegments(prev => {
      const copy = [...prev];
      [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
      return copy.map((s, i) => ({ ...s, sort_order: i }));
    });
  };

  const setStartToCurrent = (index: number) => {
    updateSegment(index, 'start_sec', parseFloat(currentTime.toFixed(1)));
  };

  const setEndToCurrent = (index: number) => {
    updateSegment(index, 'end_sec', parseFloat(currentTime.toFixed(1)));
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  };

  const saveSegments = async () => {
    setSaving(true);
    try {
      // Delete existing
      await supabase.from('eng_words').delete().in(
        'chunk_id',
        segments.filter(s => s.id).map(s => s.id!)
      );
      await supabase.from('saslgloss_chunks').delete().eq('lesson_id', lessonId);

      // Insert new segments
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i];
        const { data: chunk } = await supabase
          .from('saslgloss_chunks')
          .insert({
            lesson_id: lessonId,
            start_sec: seg.start_sec,
            end_sec: seg.end_sec,
            sasl_gloss: seg.sasl_gloss,
            english_text: seg.english_text,
            sort_order: i,
          })
          .select()
          .single();

        if (chunk) {
          const words = seg.english_text.trim().split(/\s+/).filter(Boolean);
          if (words.length > 0) {
            const segDuration = seg.end_sec - seg.start_sec;
            const wordDuration = segDuration / words.length;
            const wordEntries = words.map((word, wi) => ({
              chunk_id: chunk.id,
              word,
              start_sec: seg.start_sec + wi * wordDuration,
              end_sec: seg.start_sec + (wi + 1) * wordDuration,
              word_order: wi,
            }));
            await supabase.from('eng_words').insert(wordEntries);
          }
        }
      }
      toast.success('Lesson saved successfully!');
    } catch {
      toast.error('Failed to save lesson');
    } finally {
      setSaving(false);
    }
  };

  // Visual timeline
  const timelinePercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Video Player */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full rounded-lg bg-foreground/5"
              controls
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            />

            {/* Visual timeline with segment markers */}
            <div className="mt-4 space-y-2">
              <div className="relative h-8 w-full rounded-lg bg-muted overflow-hidden">
                {/* Segment blocks */}
                {segments.map((seg, i) => {
                  if (duration <= 0) return null;
                  const left = (seg.start_sec / duration) * 100;
                  const width = ((seg.end_sec - seg.start_sec) / duration) * 100;
                  return (
                    <div
                      key={i}
                      className="absolute top-0 h-full cursor-pointer bg-primary/30 border-x border-primary/50 hover:bg-primary/50 transition-colors"
                      style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                      onClick={() => seekTo(seg.start_sec)}
                      title={`Segment ${i + 1}: ${seg.start_sec.toFixed(1)}s – ${seg.end_sec.toFixed(1)}s`}
                    />
                  );
                })}
                {/* Playhead */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-destructive z-10"
                  style={{ left: `${timelinePercent}%` }}
                />
              </div>
              <p className="text-center text-lg font-semibold text-muted-foreground">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Editor */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Segments ({segments.length})</h2>
          <div className="flex gap-2">
            <Button onClick={addSegment} variant="outline" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Segment
            </Button>
            <Button onClick={saveSegments} size="lg" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
              Save
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-16rem)] space-y-4 overflow-y-auto pr-2">
          {segments.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-lg text-muted-foreground">No segments yet. Play the video, position the timeline, then click "Add Segment".</p>
              </CardContent>
            </Card>
          )}

          {segments.map((seg, i) => {
            const isActive = currentTime >= seg.start_sec && currentTime < seg.end_sec;
            return (
              <Card key={i} className={`relative transition-all ${isActive ? 'ring-2 ring-primary shadow-lg' : 'hover:ring-2 hover:ring-primary/20'}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => moveSegment(i, 'up')}
                          disabled={i === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                          aria-label="Move up"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <CardTitle className="text-lg">Segment {i + 1}</CardTitle>
                      {isActive && <span className="text-xs font-bold text-primary">● ACTIVE</span>}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeSegment(i)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm font-semibold">Start (s)</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={seg.start_sec}
                          onChange={(e) => updateSegment(i, 'start_sec', parseFloat(e.target.value) || 0)}
                          className="h-11 text-lg"
                        />
                        <Button variant="ghost" size="icon" onClick={() => setStartToCurrent(i)} title="Set to current time">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold">End (s)</Label>
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.1"
                          value={seg.end_sec}
                          onChange={(e) => updateSegment(i, 'end_sec', parseFloat(e.target.value) || 0)}
                          className="h-11 text-lg"
                        />
                        <Button variant="ghost" size="icon" onClick={() => setEndToCurrent(i)} title="Set to current time">
                          <Clock className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">SASL Gloss (ALL-CAPS, optional)</Label>
                    <Input
                      placeholder='[NAME] [MY]'
                      value={seg.sasl_gloss}
                      onChange={(e) => updateSegment(i, 'sasl_gloss', e.target.value.toUpperCase())}
                      className="h-11 text-lg font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold">English Translation *</Label>
                    <Input
                      placeholder="My name is..."
                      value={seg.english_text}
                      onChange={(e) => updateSegment(i, 'english_text', e.target.value)}
                      required
                      className="h-11 text-lg"
                    />
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => seekTo(seg.start_sec)}>
                    ▶ Play from {seg.start_sec.toFixed(1)}s
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
