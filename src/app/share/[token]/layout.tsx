import { Metadata } from 'next';
import { getShareByToken } from '@/lib/share-utils';

interface Props {
  params: Promise<{ token: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;

  try {
    const share = await getShareByToken(token);

    if (!share) {
      return {
        title: 'Share Not Found - Firefly ',
        description: 'The requested share could not be found or has expired.',
      };
    }

    // Helper function to format file size
    const formatFileSize = (bytes: number): string => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    // Clean up file name (remove underscores, clean extensions)
    const cleanFileName = (name: string): string => {
      return name.replace(/_/g, ' ').replace(/\.[^/.]+$/, '');
    };

    if (share.file) {
      // Single file share
      const fileName = cleanFileName(share.file.originalName);
      const fileSize = formatFileSize(Number(share.file.size));
      const mimeType = share.file.mimeType;

      // Determine file type icon/emoji for description
      let fileTypeIcon = '📄';
      if (mimeType.startsWith('video/')) fileTypeIcon = '🎬';
      else if (mimeType.startsWith('image/')) fileTypeIcon = '🖼️';
      else if (mimeType.startsWith('audio/')) fileTypeIcon = '🎵';
      else if (mimeType.includes('pdf')) fileTypeIcon = '📕';
      else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) fileTypeIcon = '📦';
      else if (mimeType.includes('document') || mimeType.includes('word')) fileTypeIcon = '📝';
      else if (mimeType.includes('sheet') || mimeType.includes('excel')) fileTypeIcon = '📊';
      else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) fileTypeIcon = '📽️';

      const description = `${fileTypeIcon} ${fileName} • ${fileSize} • Shared by ${share.user.name || share.user.email}`;

      return {
        title: `${fileName} - Firefly `,
        description: description,
        openGraph: {
          title: fileName,
          description: `${fileSize} • Shared on Firefly `,
          type: 'website',
          siteName: 'Firefly ',
          images: [
            {
              url: mimeType.startsWith('image/')
                ? `/api/share/${token}/thumbnail/${share.file.id}`
                : '/logo-512.png',
              width: 1200,
              height: 630,
              alt: fileName,
            }
          ],
        },
        twitter: {
          card: mimeType.startsWith('image/') ? 'summary_large_image' : 'summary',
          title: fileName,
          description: `${fileSize} • Shared on Firefly `,
          images: mimeType.startsWith('image/')
            ? [`/api/share/${token}/thumbnail/${share.file.id}`]
            : ['/logo-512.png'],
        },
      };
    } else if (share.folder) {
      // Folder share
      const folderName = share.folder.name;
      const fileCount = share.folder.files.length;
      const subfolderCount = share.folder.children.length;

      // Calculate total size
      const totalSize = share.folder.files.reduce((sum: number, file: any) =>
        sum + Number(file.size), 0
      );
      const totalSizeFormatted = formatFileSize(totalSize);

      const description = `📁 ${folderName} • ${fileCount} files, ${subfolderCount} folders • ${totalSizeFormatted} • Shared by ${share.user.name || share.user.email}`;

      return {
        title: `${folderName} - Firefly `,
        description: description,
        openGraph: {
          title: folderName,
          description: `${fileCount} files, ${subfolderCount} folders • ${totalSizeFormatted} • Shared on Firefly `,
          type: 'website',
          siteName: 'Firefly ',
          images: [
            {
              url: '/logo-512.png',
              width: 1200,
              height: 630,
              alt: folderName,
            }
          ],
        },
        twitter: {
          card: 'summary',
          title: folderName,
          description: `${fileCount} files, ${subfolderCount} folders • ${totalSizeFormatted}`,
          images: ['/logo-512.png'],
        },
      };
    }

    // Fallback
    return {
      title: 'Shared Content - Firefly ',
      description: 'View shared content on Firefly ',
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Shared Content - Firefly ',
      description: 'View shared content on Firefly ',
    };
  }
}

export default function ShareLayout({ children }: Props) {
  return <>{children}</>;
}
