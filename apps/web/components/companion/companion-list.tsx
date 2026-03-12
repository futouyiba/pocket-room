/**
 * Companion List Component
 * 
 * Displays user's registered companions with management options.
 * Validates requirements: 13.1, 13.5
 */

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';

export interface Companion {
  id: string;
  name: string;
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  providerConnectionId: string;
  provider: string;
  createdAt: Date;
}

export interface CompanionListProps {
  companions: Companion[];
  onDelete: (companionId: string) => Promise<void>;
  onEdit?: (companion: Companion) => void;
}

export function CompanionList({ companions, onDelete, onEdit }: CompanionListProps) {
  if (companions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No companions registered yet. Register your first companion to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {companions.map((companion) => (
        <Card key={companion.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{companion.name}</CardTitle>
                <CardDescription>
                  <Badge variant="secondary" className="text-xs">
                    {companion.provider.toUpperCase()}
                  </Badge>
                  <span className="ml-2 text-xs">{companion.model}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {companion.systemPrompt && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {companion.systemPrompt}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(companion)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(companion.id)}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
