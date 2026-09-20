import LoginForm from "./login-form";

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string; confirmed?: string }>;
}) {
  const searchParams = await props.searchParams;
  return (
    <LoginForm
      next={searchParams.next ?? "/"}
      verified={searchParams.confirmed === "true"}
    />
  );
}