import type { Metadata } from "next";

interface SharedFileLayoutProps {
  children: React.ReactNode;
  params: {
    username: string;
    slug: string;
    filename?: string[];
  };
}

async function getSharedFileData(username: string, slug: string, filename?: string[]) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    let url = `${baseUrl}/api/shared/${username}/${slug}`;

    if (filename && filename.length > 0) {
      url += `/${filename.join('/')}`;
    }

    const response = await fetch(url, {
      cache: 'no-store'
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching shared file data:', error);
    return null;
  }
}

export async function generateMetadata({ params }: SharedFileLayoutProps): Promise<Metadata> {
  const sharedData = await getSharedFileData(params.username, params.slug, params.filename);

  if (!sharedData) {
    return {
      title: 'Shared Content Not Found | Firefly ',
      description: 'The requested shared content could not be found.',
      robots: { index: false, follow: false }
    };
  }

  const baseUrl = process.env.NEXTAUTH_URL;
  let shareUrl = `${baseUrl}/shared/${params.username}/${params.slug}`;
  if (params.filename && params.filename.length > 0) {
    shareUrl += `/${params.filename.join('/')}`;
  }

  // Auto-generated OG image URL as fallback
  const getAutoOgImage = (title: string, desc: string) =>
    `${baseUrl}/api/og/shared?title=${encodeURIComponent(title)}&description=${encodeURIComponent(desc)}&username=${encodeURIComponent(sharedData.user.username)}&files=1`;

  // Handle single file metadata
  if (sharedData.type === 'file' && sharedData.file) {
    const file = sharedData.file;
    const title = `Firefly  | ${sharedData.folder.name} - ${file.originalName}`;
    const description = `Shared file "${file.originalName}" from "${sharedData.folder.name}" folder by ${sharedData.user.username} on Firefly `;

    let previewImage = '/logo-512.png';
    let mediaType = 'website';

    if (file.mimeType.startsWith('image/')) {
      previewImage = `/api/shared/${params.username}/${params.slug}/preview/${file.id}`;
      mediaType = 'image';
    } else if (file.mimeType.startsWith('video/')) {
      previewImage = `/api/shared/${params.username}/${params.slug}/preview/${file.id}?thumbnail=true`;
      mediaType = 'video';
    }

    return {
      title,
      description,
      keywords: [
        'shared file',
        'cloud storage',
        'file sharing',
        file.originalName,
        sharedData.folder.name,
        sharedData.user.username,
        'Firefly '
      ],
      authors: [{ name: sharedData.user.name || sharedData.user.username }],
      creator: sharedData.user.username,
      openGraph: {
        title,
        description,
        type: mediaType as any,
        locale: 'en_US',
        url: shareUrl,
        siteName: 'Firefly ',
        images: [
          {
            url: previewImage,
            width: file.mimeType.startsWith('image/') ? 1200 : 1920,
            height: file.mimeType.startsWith('image/') ? 630 : 1080,
            alt: `Preview of ${file.originalName}`,
            type: file.mimeType.startsWith('image/') ? file.mimeType : 'image/png'
          },
          {
            url: getAutoOgImage(title, description),
            width: 1200,
            height: 630,
            alt: `Auto-generated preview of ${file.originalName}`,
            type: 'image/png'
          }
        ],
        ...(file.mimeType.startsWith('video/') && {
          videos: [
            {
              url: `/api/shared/${params.username}/${params.slug}/stream/${file.id}`,
              type: file.mimeType,
              width: 1920,
              height: 1080,
            }
          ]
        })
      },
      twitter: {
        card: file.mimeType.startsWith('image/') ? 'summary_large_image' : 'player',
        title,
        description,
        images: [previewImage],
        creator: `@${sharedData.user.username}`,
        ...(file.mimeType.startsWith('video/') && {
          players: [
            {
              url: shareUrl,
              width: 1920,
              height: 1080,
            }
          ]
        })
      },
      robots: {
        index: true,
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
        'og:image:width': file.mimeType.startsWith('image/') ? '1200' : '1920',
        'og:image:height': file.mimeType.startsWith('image/') ? '630' : '1080',
        ...(file.mimeType.startsWith('video/') && {
          'og:video:type': file.mimeType,
          'og:video:width': '1920',
          'og:video:height': '1080',
          'og:video:url': `/api/shared/${params.username}/${params.slug}/stream/${file.id}`,
          'og:video:secure_url': `/api/shared/${params.username}/${params.slug}/stream/${file.id}`,
        }),
        'article:author': sharedData.user.name || sharedData.user.username,
        'article:published_time': file.createdAt,
        'file:size': file.size.toString(),
        'file:type': file.mimeType,
        'file:name': file.originalName,
      }
    };
  }

  // Handle folder metadata (fallback to folder metadata)
  if (sharedData.folder) {
    const folderName = sharedData.folder.name;
    const description = sharedData.folder.description || `Shared folder "${folderName}" by ${sharedData.user.username} on Firefly `;
    const title = `Firefly  | ${folderName}`;

    let previewImage = '/logo-512.png';

    if (sharedData.folder.files && sharedData.folder.files.length > 0) {
      const firstImage = sharedData.folder.files.find((file: any) =>
        file.mimeType.startsWith('image/')
      );

      if (firstImage) {
        previewImage = `/api/shared/${params.username}/${params.slug}/preview/${firstImage.id}`;
      } else {
        const firstVideo = sharedData.folder.files.find((file: any) =>
          file.mimeType.startsWith('video/')
        );

        if (firstVideo) {
          previewImage = `/api/shared/${params.username}/${params.slug}/preview/${firstVideo.id}?thumbnail=true`;
        }
      }
    }

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
            url: getAutoOgImage(title, description),
            width: 1200,
            height: 630,
            alt: `Auto-generated preview of ${folderName} shared folder`,
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
        index: true,
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
      }
    };
  }

  // Fallback
  return {
    title: 'Shared Content | Firefly ',
    description: 'Shared content on Firefly ',
    robots: { index: false, follow: false }
  };
}

export default function SharedFileLayout({ children }: SharedFileLayoutProps) {
  return (
    <div className="shared-file-layout">
      {children}
    </div>
  );
}