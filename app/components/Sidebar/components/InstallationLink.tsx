import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { getFullVersion } from "@shared/utils/packageVersion";
import Badge from "~/components/Badge";
import { client } from "~/utils/ApiClient";
import Logger from "~/utils/Logger";
import SidebarLink from "./SidebarLink";

/**
 * Link to upstream Outline releases with optional update status.
 */
export default function InstallationLink() {
  const [versionsBehind, setVersionsBehind] = useState(-1);
  const { t } = useTranslation();
  const currentVersion = getFullVersion();

  useEffect(() => {
    async function loadVersionInfo() {
      try {
        const res = await client.post("/installation.info");
        if (res.data && res.data.versionsBehind >= 0) {
          setVersionsBehind(res.data.versionsBehind);
        }
      } catch (error) {
        Logger.error("Failed to load version info", error);
      }
    }

    void loadVersionInfo();
  }, []);

  return (
    <SidebarLink
      target="_blank"
      href="https://github.com/outline/outline/releases"
      label={
        <>
          v{currentVersion}
          {versionsBehind >= 0 && (
            <>
              <br />
              <LilBadge>
                {versionsBehind === 0
                  ? t("Up to date")
                  : t(`{{ releasesBehind }} versions behind`, {
                      releasesBehind: versionsBehind,
                      count: versionsBehind,
                    })}
              </LilBadge>
            </>
          )}
        </>
      }
    />
  );
}

const LilBadge = styled(Badge)`
  margin-inline-start: 0;
`;
