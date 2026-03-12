/**
 * Companion Section Component
 * 
 * Main component for managing AI Companions in Settings.
 * Implements requirements: 13.1, 13.2, 13.3, 13.5
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { CompanionRegistrationForm, type CompanionFormData } from './companion-registration-form';
import { CompanionEditForm, type CompanionEditData } from './companion-edit-form';
import { CompanionList, type Companion } from './companion-list';
import type { Connection } from '@/lib/provider-binding/types';

export interface CompanionSectionProps {
  initialCompanions: Companion[];
  connections: Connection[];
}

export function CompanionSection({ initialCompanions, connections }: CompanionSectionProps) {
  const [companions, setCompanions] = useState<Companion[]>(initialCompanions);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [editingCompanion, setEditingCompanion] = useState<Companion | null>(null);
  const [deletingCompanion, setDeletingCompanion] = useState<Companion | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegisterCompanion = async (formData: CompanionFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/companion/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to register companion');
      }

      const newCompanion = await response.json();
      setCompanions((prev) => [...prev, newCompanion]);
      setShowRegistrationDialog(false);
    } catch (error) {
      console.error('Failed to register companion:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCompanion = async (formData: CompanionEditData) => {
    if (!editingCompanion) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/companion/${editingCompanion.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to update companion');
      }

      const updatedCompanion = await response.json();
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === editingCompanion.id
            ? { ...c, ...updatedCompanion }
            : c
        )
      );
      setEditingCompanion(null);
    } catch (error) {
      console.error('Failed to update companion:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCompanion = async (companionId: string) => {
    const companion = companions.find((c) => c.id === companionId);
    if (companion) {
      setDeletingCompanion(companion);
    }
  };

  const confirmDelete = async () => {
    if (!deletingCompanion) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/companion/${deletingCompanion.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to delete companion');
      }

      setCompanions((prev) => prev.filter((c) => c.id !== deletingCompanion.id));
      setDeletingCompanion(null);
    } catch (error) {
      console.error('Failed to delete companion:', error);
      alert('Failed to delete companion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Companions</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Register and manage your personal AI assistants
          </p>
        </div>
        <Button onClick={() => setShowRegistrationDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Register Companion
        </Button>
      </div>

      {/* Companion List */}
      <CompanionList
        companions={companions}
        onDelete={handleDeleteCompanion}
        onEdit={setEditingCompanion}
      />

      {/* Registration Dialog */}
      <Dialog open={showRegistrationDialog} onOpenChange={setShowRegistrationDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Register New Companion</DialogTitle>
            <DialogDescription>
              Create a new AI companion by selecting a provider connection and configuring its behavior.
            </DialogDescription>
          </DialogHeader>
          <CompanionRegistrationForm
            connections={connections}
            onSubmit={handleRegisterCompanion}
            onCancel={() => setShowRegistrationDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCompanion} onOpenChange={(open) => !open && setEditingCompanion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Companion</DialogTitle>
            <DialogDescription>
              Update your companion's configuration. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          {editingCompanion && (
            <CompanionEditForm
              companion={editingCompanion}
              onSubmit={handleEditCompanion}
              onCancel={() => setEditingCompanion(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCompanion} onOpenChange={(open) => !open && setDeletingCompanion(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Companion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCompanion?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeletingCompanion(null)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
