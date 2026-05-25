import { observer } from "mobx-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation, Trans } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import { IntegrationService, IntegrationType } from "@shared/types";
import { IntegrationScene } from "~/scenes/Settings/components/IntegrationScene";
import { ConnectedButton } from "~/scenes/Settings/components/ConnectedButton";
import SettingRow from "~/scenes/Settings/components/SettingRow";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import List from "~/components/List";
import ListItem from "~/components/List/Item";
import Notice from "~/components/Notice";
import PlaceholderText from "~/components/PlaceholderText";
import Text from "~/components/Text";
import Time from "~/components/Time";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import JiraIcon from "./Icon";

type FormData = {
  url: string;
  isCloud: boolean;
  authType: "pat" | "basic";
  email: string;
  username: string;
  token: string;
  p12Passphrase: string;
  useClientCertificate: boolean;
};

/**
 * Reads a local file as a base64 string without the data URL prefix.
 *
 * @param file - File selected in the browser.
 * @return Base64-encoded file contents.
 */
async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read certificate file"));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to read certificate file"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function JiraSettings() {
  const { integrations } = useStores();
  const { t } = useTranslation();
  const appName = env.APP_NAME;
  const [showForm, setShowForm] = React.useState(false);
  const [p12File, setP12File] = React.useState<File | null>(null);
  const [clearP12, setClearP12] = React.useState(false);

  const integration = integrations.jira[0];
  const jiraSettings = integration?.settings?.jira;

  const {
    register,
    reset,
    handleSubmit: formHandleSubmit,
    watch,
    formState,
  } = useForm<FormData>({
    mode: "all",
    defaultValues: {
      url: "https://jira-topvcloud.itvguide.cn",
      isCloud: false,
      authType: "basic",
      email: "",
      username: "",
      token: "",
      p12Passphrase: "",
      useClientCertificate: true,
    },
  });

  const isCloud = watch("isCloud");
  const authType = watch("authType");
  const useClientCertificate = watch("useClientCertificate");
  const hasStoredCert = jiraSettings?.hasClientCertificate;

  React.useEffect(() => {
    void integrations.fetchAll({
      service: IntegrationService.Jira,
      withRelations: true,
    });
  }, [integrations]);

  React.useEffect(() => {
    if (showForm || !integration) {
      reset({
        url: jiraSettings?.url ?? "https://jira-topvcloud.itvguide.cn",
        isCloud: jiraSettings?.isCloud ?? false,
        authType: jiraSettings?.authType ?? "basic",
        email: jiraSettings?.email ?? "",
        username: jiraSettings?.username ?? "",
        token: "",
        p12Passphrase: "",
        useClientCertificate: jiraSettings?.hasClientCertificate ?? true,
      });
      setP12File(null);
      setClearP12(false);
    }
  }, [reset, jiraSettings, integration, showForm]);

  const handleSubmit = React.useCallback(
    async (data: FormData) => {
      try {
        if (
          data.useClientCertificate &&
          !p12File &&
          !hasStoredCert &&
          !clearP12
        ) {
          toast.error(t("Please upload a P12 certificate file"));
          return;
        }

        let p12Base64: string | undefined;
        if (data.useClientCertificate && p12File) {
          p12Base64 = await readFileAsBase64(p12File);
        }

        await client.post("/jira.connect", {
          url: data.url.replace(/\/+$/, ""),
          isCloud: data.isCloud,
          authType: data.isCloud ? "basic" : data.authType,
          email: data.isCloud ? data.email : undefined,
          username: data.isCloud ? undefined : data.username,
          apiToken: data.token || undefined,
          p12Base64,
          p12Passphrase: data.useClientCertificate
            ? data.p12Passphrase || undefined
            : undefined,
          clearP12: !data.useClientCertificate || clearP12,
          integrationId: integration?.id,
        });

        await integrations.fetchAll({
          service: IntegrationService.Jira,
          withRelations: true,
        });

        toast.success(t("Settings saved"));
        setShowForm(false);
      } catch (err) {
        toast.error(err.message);
      }
    },
    [integration?.id, integrations, t, p12File, clearP12, hasStoredCert]
  );

  const connected = integrations.jira.length > 0 && !showForm;
  const displayForm = !connected;

  return (
    <IntegrationScene title="Jira" icon={<JiraIcon />}>
      <Heading>Jira</Heading>

      <Text as="p" type="secondary">
        <Trans>
          Enable previews of Jira issues in documents by connecting your Jira
          instance to {{ appName }}. Supports personal access tokens,
          username/password, and optional P12 client certificates for mTLS.
        </Trans>
      </Text>

      {connected ? (
        <>
          <Heading as="h2">
            <Flex justify="space-between" auto>
              {t("Connected")}
              <Button onClick={() => setShowForm(true)} neutral>
                {t("Edit")}
              </Button>
            </Flex>
          </Heading>
          <List>
            {integrations.jira.map((intg) => {
              const settings = intg.settings?.jira;
              const integrationCreatedBy = intg.user?.name;

              return (
                <ListItem
                  key={intg.id}
                  small
                  title={settings?.url}
                  subtitle={
                    integrationCreatedBy ? (
                      <>
                        <Trans>
                          Enabled by {{ integrationCreatedBy }}
                        </Trans>{" "}
                        &middot;{" "}
                        <Time
                          dateTime={intg.createdAt}
                          relative={false}
                          format={{ en_US: "MMMM d, y" }}
                        />
                      </>
                    ) : (
                      <PlaceholderText />
                    )
                  }
                  image={<JiraIcon />}
                  actions={
                    <ConnectedButton
                      onClick={intg.delete}
                      confirmationMessage={t(
                        "Disconnecting will prevent previewing Jira links from this workspace in documents. Are you sure?"
                      )}
                    />
                  }
                />
              );
            })}
          </List>
        </>
      ) : displayForm ? (
        <form onSubmit={formHandleSubmit(handleSubmit)}>
          <Notice>
            <Trans>
              If your Jira hostname resolves to a private IP, add it to the
              ALLOWED_PRIVATE_IP_ADDRESSES environment variable on the Outline
              server.
            </Trans>
          </Notice>

          <SettingRow
            label={t("Jira URL")}
            name="url"
            description={t(
              "The URL of your Jira instance, e.g. https://jira-topvcloud.itvguide.cn"
            )}
          >
            <Input
              placeholder="https://jira-topvcloud.itvguide.cn"
              {...register("url", { required: true })}
            />
          </SettingRow>

          <SettingRow
            label={t("Jira Cloud")}
            name="isCloud"
            description={t(
              "Enable only for Atlassian Cloud (*.atlassian.net)."
            )}
          >
            <input type="checkbox" {...register("isCloud")} />
          </SettingRow>

          {isCloud ? (
            <SettingRow
              label={t("Atlassian account email")}
              name="email"
              description={t("Email associated with your Atlassian API token")}
            >
              <Input
                type="email"
                placeholder="you@example.com"
                {...register("email", { required: isCloud })}
              />
            </SettingRow>
          ) : (
            <>
              <SettingRow
                label={t("Authentication")}
                name="authType"
                description={t(
                  "Use username and password for Data Center, or a personal access token."
                )}
              >
                <select {...register("authType")}>
                  <option value="basic">{t("Username and password")}</option>
                  <option value="pat">{t("Personal access token")}</option>
                </select>
              </SettingRow>

              {authType === "basic" && (
                <SettingRow
                  label={t("Username")}
                  name="username"
                  description={t("Jira account username")}
                >
                  <Input
                    placeholder={t("Username")}
                    {...register("username", {
                      required: authType === "basic",
                    })}
                  />
                </SettingRow>
              )}
            </>
          )}

          <SettingRow
            label={
              isCloud || authType === "pat" ? t("API token") : t("Password")
            }
            name="token"
            description={
              integration
                ? t("Leave blank to keep the existing credential.")
                : isCloud || authType === "pat"
                  ? t("Personal access token or API token.")
                  : t("Jira account password.")
            }
          >
            <Input
              type="password"
              placeholder={integration ? t("Unchanged") : undefined}
              {...register("token", { required: !integration })}
            />
          </SettingRow>

          <SettingRow
            label={t("Client certificate (P12)")}
            name="useClientCertificate"
            description={t(
              "Enable when your Jira gateway requires a P12/PFX client certificate for HTTPS."
            )}
          >
            <input type="checkbox" {...register("useClientCertificate")} />
          </SettingRow>

          {useClientCertificate && (
            <>
              <SettingRow
                label={t("P12 certificate file")}
                name="p12File"
                description={
                  hasStoredCert && !p12File
                    ? t(
                        "A certificate is already stored. Upload a new file to replace it."
                      )
                    : t(
                        "Export the same client certificate from your browser or OS as a .p12/.pfx file. The browser login prompt does not send the certificate to Outline."
                      )
                }
              >
                <input
                  type="file"
                  accept=".p12,.pfx"
                  onChange={(ev) => {
                    const file = ev.currentTarget.files?.[0] ?? null;
                    setP12File(file);
                    setClearP12(false);
                  }}
                />
              </SettingRow>

              <SettingRow
                label={t("P12 passphrase")}
                name="p12Passphrase"
                description={t(
                  "Passphrase for the certificate file. Leave blank when editing to keep the existing passphrase if the certificate file is unchanged."
                )}
                border={false}
              >
                <Input
                  type="password"
                  placeholder={t("Certificate passphrase")}
                  {...register("p12Passphrase")}
                />
              </SettingRow>

              {hasStoredCert && (
                <SettingRow
                  label={t("Remove certificate")}
                  name="clearP12"
                  border={false}
                >
                  <label>
                    <input
                      type="checkbox"
                      checked={clearP12}
                      onChange={(ev) => setClearP12(ev.currentTarget.checked)}
                    />{" "}
                    {t("Remove stored client certificate")}
                  </label>
                </SettingRow>
              )}
            </>
          )}

          <Actions reverse justify="end" gap={8}>
            {integration && (
              <Button neutral onClick={() => setShowForm(false)}>
                {t("Cancel")}
              </Button>
            )}
            <StyledSubmit
              type="submit"
              disabled={!formState.isValid || formState.isSubmitting}
            >
              {formState.isSubmitting ? `${t("Saving")}…` : t("Save")}
            </StyledSubmit>
          </Actions>
        </form>
      ) : null}
    </IntegrationScene>
  );
}

const Actions = styled(Flex)`
  margin-top: 8px;
`;

const StyledSubmit = styled(Button)`
  width: 80px;
`;

export default observer(JiraSettings);
