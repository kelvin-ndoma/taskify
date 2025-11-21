// components/UserAvatar.js
import React from 'react';

const UserAvatar = ({ user, size = 5 }) => {
  const getSafeImageUrl = (imageUrl) => {
    if (!imageUrl || imageUrl.trim() === "" || imageUrl === "null") {
      return null;
    }
    return imageUrl;
  };

  const safeImage = getSafeImageUrl(user?.image);
  
  if (safeImage) {
    return (
      <img
        src={safeImage}
        alt={user?.name || "User"}
        className={`size-${size} rounded-full bg-gray-200 dark:bg-zinc-800`}
      />
    );
  }
  
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U";
  return (
    <div className={`size-${size} rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-xs font-medium`}>
      {initials}
    </div>
  );
};

export default UserAvatar;