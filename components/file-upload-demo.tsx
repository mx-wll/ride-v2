'use client'

import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FileUploadDemoProps {
  userId: string
}

export const FileUploadDemo = ({ userId }: FileUploadDemoProps) => {
  const bucketName = 'profile-pictures'
  const props = useSupabaseUpload({
    bucketName,
    path: `${userId}/avatar`,
    allowedMimeTypes: ['image/*'],
    maxFiles: 1,
    maxFileSize: 1000 * 1000 * 10, // 10MB,
    upsert: true,
  })
  const supabase = createClient()
  const { isSuccess, files } = props
  const processedSuccessRef = useRef(false)

  useEffect(() => {
    const updateUserAvatar = async () => {
      if (isSuccess && files.length > 0 && !processedSuccessRef.current) {
        processedSuccessRef.current = true // Mark as processing
        // Path used for upload (filename determined by upsert)
        const uploadedFile = files[0] // Assuming maxFiles is 1
        const avatarPath = `${userId}/avatar/${uploadedFile.name}` // Remove 'public/' prefix

        console.log(`Attempting to get public URL for path relative to bucket: ${avatarPath}`)
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(avatarPath)

        const publicUrl = urlData?.publicUrl

        if (publicUrl) {
          const cacheBustedUrl = `${publicUrl}?t=${new Date().getTime()}` // Add timestamp for cache busting
          console.log(`Public URL obtained: ${publicUrl}`)
          console.log(`Cache-busted URL: ${cacheBustedUrl}`)
          console.log(`Attempting to update profile for user: ${userId}`)
          // Update the profiles table
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: cacheBustedUrl, updated_at: new Date().toISOString() }) // Use cache-busted URL
            .eq('id', userId)

          if (updateError) {
            console.error('Error updating profile avatar_url:', updateError)
            processedSuccessRef.current = false // Reset if update failed
          } else {
            console.log('Profile avatar_url updated successfully.')
            // Supabase client should automatically refresh session/notify listeners
          }
        } else {
          console.error('Could not get public URL for the uploaded avatar.')
          processedSuccessRef.current = false // Reset if URL fetch failed
        }
      }
    }

    updateUserAvatar()

    // Reset the flag if the component is no longer in a success state
    if (!isSuccess) {
      processedSuccessRef.current = false
    }
  }, [isSuccess, files, userId, supabase, bucketName])

  return (
    <div>
      <Dropzone {...props}>
        <DropzoneEmptyState />
        <DropzoneContent />
      </Dropzone>
    </div>
  )
} 