import type { UserInstance } from "../../models/user";
import AuthSession from "../../utils/session";
import "../profileCalendar.scss";

type ProfileCardProps = {
  profile: UserInstance;
};

const ProfileCard = ({ profile }: ProfileCardProps) => {
  const resolvedName = profile?.name || AuthSession.getName();
  const resolvedEmail = profile?.email || AuthSession.getEmail();
  const rawRole =
    profile?.role?.name ?? profile?.role ?? AuthSession.getRoles();
  const resolvedRole =
    typeof rawRole === "string" &&
    rawRole !== "[object Object]" &&
    rawRole !== "object Object"
      ? rawRole
      : "";

  return (
    <div className="profile-section">
      <div className="profile-info">
        <h2>Welcome, {resolvedName}</h2>
        <p>{resolvedEmail}</p>
        {resolvedRole && <p> Role: {resolvedRole}</p>}
      </div>
    </div>
  );
};

export default ProfileCard;