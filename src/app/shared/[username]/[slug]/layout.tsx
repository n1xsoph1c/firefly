import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface SharedLayoutProps {
  children: React.ReactNode;
  params: {
    username: string;
    slug: string;
  };
}

async function getSharedFolderData(username: string, slug: string) {
  try {
    // In a server component, we need to use the full URL for fetch
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/shared/${username}/${slug}`, {
      cache: 'no-store' // Always fetch fresh data for metadata
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching shared folder data:', error);
    return null;
  }
}

export async function generateMetadata({ params }: SharedLayoutProps): Promise<Metadata> {
  const sharedData = await getSharedFolderData(params.username, params.slug);

  if (!sharedData || !sharedData.folder) {
    return {
      title: 'Shared Content Not Found | Firefly ',
      description: 'The requested shared content could not be found.',
      robots: { index: false, follow: false }
    };
  }

  const folderName = sharedData.folder.name;
  const description = sharedData.folder.description || `Shared folder "${folderName}" by ${sharedData.user.username} on Firefly `;
  const title = `Firefly  | ${folderName}`;

  // Find the first image or video for the preview
  let previewImage = '/logo-512.png'; // Default fallback

  if (sharedData.folder.files && sharedData.folder.files.length > 0) {
    // Look for first image
    const firstImage = sharedData.folder.files.find((file: any) =>
      file.mimeType.startsWith('image/')
    );

    if (firstImage) {
      previewImage = `/api/shared/${params.username}/${params.slug}/preview/${firstImage.id}`;
    } else {
      // Look for first video (will use thumbnail)
      const firstVideo = sharedData.folder.files.find((file: any) =>
        file.mimeType.startsWith('video/')
      );

      if (firstVideo) {
        previewImage = `/api/shared/${params.username}/${params.slug}/preview/${firstVideo.id}?thumbnail=true`;
      }
    }
  }

  const baseUrl = process.env.NEXTAUTH_URL;
  const shareUrl = `${baseUrl}/shared/${params.username}/${params.slug}`;

  // Auto-generated OG image URL as fallback
  const autoOgImage = `${baseUrl}/api/og/shared?title=${encodeURIComponent(folderName)}&description=${encodeURIComponent(description)}&username=${encodeURIComponent(sharedData.user.username)}&files=${sharedData.folder.totalFiles || sharedData.folder.files?.length || 0}`;

  return {
    title,
    description,
    keywords: [
      'shared folder',
      'cloud storage',
      'file sharing',
      folderName,
      sharedData.user.username,
      'Firefly '
    ],
    authors: [{ name: sharedData.user.name || sharedData.user.username }],
    creator: sharedData.user.username,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_US',
      url: shareUrl,
      siteName: 'Firefly ',
      images: [
        {
          url: previewImage,
          width: 1200,
          height: 630,
          alt: `Preview of ${folderName} shared folder`,
          type: 'image/png'
        },
        {
          url: autoOgImage,
          width: 1200,
          height: 630,
          alt: `Auto-generated preview of ${folderName} shared folder`,
          type: 'image/png'
        },
        {
          url: `${baseUrl}/logo-512.png`,
          width: 512,
          height: 512,
          alt: 'Firefly  Logo',
          type: 'image/png'
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [previewImage],
      creator: `@${sharedData.user.username}`
    },
    robots: {
      index: true, // Allow indexing of shared folders
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: shareUrl,
    },
    other: {
      'og:video:width': '1920',
      'og:video:height': '1080',
      'og:image:width': '1200',
      'og:image:height': '630',
      // Additional metadata for better social sharing
      'article:author': sharedData.user.name || sharedData.user.username,
      'article:published_time': sharedData.folder.createdAt || new Date().toISOString(),
      // Telegram and WhatsApp optimizations
      'telegram:channel': '@rafiscloud',
      'whatsapp:title': title,
      'whatsapp:description': description.slice(0, 150), // WhatsApp limits description length
    }
  };
}

export default function SharedLayout({ children, params }: SharedLayoutProps) {
  return (
    <div className="shared-layout">
      {children}
    </div>
  );
}