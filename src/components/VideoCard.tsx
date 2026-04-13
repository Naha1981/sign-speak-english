import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Eye, Send, Video, Undo2, Trash2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';

interface VideoCardProps {
  id: string;
  title: string;
  gradeLevel: string;
  status: string;
  thumbnailUrl?: string | null;
  lessonId?: string | null;
  isAdmin?: boolean;
  onPublish?: (id: string) => void;
  onUnpublish?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function VideoCard({ id, title, gradeLevel, status, thumbnailUrl, lessonId, isAdmin, onPublish, onUnpublish, onDelete }: VideoCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20">
      <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {thumbnailUrl ? (
          <img src={thumbnailUrl} alt={title} className="h-full w-full object-cover" />
        ) : (
          <Video className="h-12 w-12 text-muted-foreground/40" />
        )}
        <Badge
          className="absolute right-3 top-3 text-sm font-semibold"
          variant={status === 'published' ? 'default' : 'secondary'}
        >
          {status === 'published' ? 'Published' : 'Draft'}
        </Badge>
      </div>
      <CardContent className="p-5">
        <h3 className="text-xl font-bold text-card-foreground line-clamp-2">{title}</h3>
        <p className="mt-1 text-base text-muted-foreground">{gradeLevel}</p>
      </CardContent>
      {isAdmin && (
        <CardFooter className="flex-wrap gap-2 p-5 pt-0">
          {lessonId ? (
            <Button variant="outline" size="lg" asChild className="flex-1">
              <Link to="/editor/$lessonId" params={{ lessonId }}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="lg" asChild className="flex-1">
              <Link to="/upload">
                <Edit className="mr-2 h-4 w-4" />
                Create Lesson
              </Link>
            </Button>
          )}
          {lessonId && (
            <Button variant="ghost" size="lg" asChild className="flex-1">
              <Link to="/play/$lessonId" params={{ lessonId }}>
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Link>
            </Button>
          )}
          {status === 'draft' && onPublish && (
            <Button size="lg" onClick={() => onPublish(id)} className="flex-1">
              <Send className="mr-2 h-4 w-4" />
              Publish
            </Button>
          )}
          {status === 'published' && onUnpublish && (
            <Button variant="secondary" size="lg" onClick={() => onUnpublish(id)} className="flex-1">
              <Undo2 className="mr-2 h-4 w-4" />
              Unpublish
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="icon" onClick={() => onDelete(id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
