import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PulsePostView } from "@/components/pulse/PulsePostView";

export default async function PulsePostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  // Fetch the post with user details
  const { data: post, error } = await supabase
    .from("pulse_posts")
    .select(`
      id,
      body,
      created_at,
      updated_at,
      user_id,
      is_pinned,
      user:user_id (
        id,
        full_name,
        email,
        role,
        avatar_url
      )
    `)
    .eq("id", id)
    .single();

  if (error || !post) {
    notFound();
  }

  // Fetch comments
  const { data: comments } = await supabase
    .from("pulse_comments")
    .select(`
      id,
      body,
      created_at,
      user:user_id (
        id,
        full_name,
        email,
        role,
        avatar_url
      )
    `)
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  // Fetch reactions
  const { data: reactions } = await supabase
    .from("pulse_reactions")
    .select("emoji, user_id")
    .eq("post_id", id);

  // Fetch attachments
  const { data: attachments } = await supabase
    .from("pulse_attachments")
    .select("id, storage_path, content_type, created_at")
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const reactionEmojis = ["heart", "thumbs_up", "laugh", "clap"];
  const aggregatedReactions = reactionEmojis.map((emoji) => {
    const emojiReactions = reactions?.filter((r) => r.emoji === emoji) || [];
    return {
      emoji,
      count: emojiReactions.length,
      userReacted: emojiReactions.some((r) => r.user_id === user.id),
    };
  });

  // Fetch comment reactions for all comments
  const commentsWithReactions = await Promise.all(
    (comments || []).map(async (comment: any) => {
      const { data: commentReactions } = await supabase
        .from("pulse_comment_reactions")
        .select("emoji, user_id")
        .eq("comment_id", comment.id);

      const aggregatedCommentReactions = reactionEmojis.map((emoji) => {
        const emojiReactions = commentReactions?.filter((r) => r.emoji === emoji) || [];
        return {
          emoji,
          count: emojiReactions.length,
          userReacted: emojiReactions.some((r) => r.user_id === user.id),
        };
      });

      return {
        id: comment.id,
        body: comment.body,
        created_at: comment.created_at,
        user: {
          id: comment.user.id,
          full_name: comment.user.full_name || comment.user.email,
          email: comment.user.email,
          role: comment.user.role,
          avatar_url: comment.user.avatar_url,
        },
        reactions: aggregatedCommentReactions,
      };
    })
  );

  // Get current user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const currentUserRole = userData?.role || null;

  // Normalize post.user (Supabase returns array for foreign key relations)
  const postUser: any = Array.isArray(post.user) && post.user.length > 0 ? post.user[0] : post.user;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pulse Post</h1>
      </div>
      <PulsePostView
        post={{
          id: post.id,
          body: post.body,
          created_at: post.created_at,
          updated_at: post.updated_at,
          user_id: post.user_id,
          is_pinned: post.is_pinned,
          user: {
            id: postUser?.id || '',
            full_name: postUser?.full_name || postUser?.email || '',
            email: postUser?.email || '',
            role: postUser?.role || 'client',
            avatar_url: postUser?.avatar_url || null,
          },
          comments: commentsWithReactions,
          reactions: aggregatedReactions,
          attachments: attachments || [],
        }}
        currentUserId={user.id}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
