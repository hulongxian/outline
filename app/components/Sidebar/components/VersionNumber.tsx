import styled from "styled-components";
import { s } from "@shared/styles";
import { getFullVersion } from "@shared/utils/packageVersion";

/**
 * Displays the installation version as plain text in the settings sidebar.
 */
export default function VersionNumber() {
  return <Text>v{getFullVersion()}</Text>;
}

const Text = styled.div`
  font-size: 14px;
  font-weight: 475;
  padding: 6px 16px;
  color: ${s("sidebarText")};
  user-select: text;
  cursor: default;
`;
