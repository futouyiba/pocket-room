/**
 * Invitation Confirmation Page
 * 
 * Displays invitation details and allows invitee to accept or reject.
 * Requirements: 3.5, 3.7
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@/lib/supabase/server';
import InvitationConfirmation from '@/components/invitations/invitation-confirmation';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function InvitationPage({ params }: PageProps) {
  const supabase = createServerComponentClient();
  
  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    // Redirect to login with return URL
    redirect(`/login?returnTo=/invitations/${params.id}`);
  }
  
  // Fetch invitation details
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      rooms!inner(
        id,
        name,
        description,
        join_strategy,
        created_at
      ),
      inviter:auth.users!inviter_id(
        id,
        email
      )
    `)
    .eq('id', params.id)
    .eq('invitee_id', user.id)
    .single();
  
  if (invitationError || !invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900">邀请不存在</h1>
          <p className="mt-2 text-red-700">
            该邀请不存在或您无权访问。
          </p>
        </div>
      </div>
    );
  }
  
  // Check if invitation is already processed
  if (invitation.status !== 'pending') {
    const statusText = invitation.status === 'accepted' ? '已接受' : '已拒绝';
    const statusColor = invitation.status === 'accepted' ? 'green' : 'gray';
    
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className={`w-full max-w-md rounded-lg border border-${statusColor}-200 bg-${statusColor}-50 p-6 text-center`}>
          <h1 className={`text-2xl font-bold text-${statusColor}-900`}>
            邀请{statusText}
          </h1>
          <p className={`mt-2 text-${statusColor}-700`}>
            您已经处理过这个邀请。
          </p>
          {invitation.status === 'accepted' && (
            <a
              href={`/rooms/${invitation.room_id}`}
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              前往 Room
            </a>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div>加载中...</div>}>
        <InvitationConfirmation
          invitation={{
            id: invitation.id,
            roomId: invitation.room_id,
            roomName: invitation.rooms.name,
            roomDescription: invitation.rooms.description,
            joinStrategy: invitation.rooms.join_strategy,
            inviterEmail: invitation.inviter?.email || '未知用户',
            createdAt: invitation.created_at,
          }}
        />
      </Suspense>
    </div>
  );
}
