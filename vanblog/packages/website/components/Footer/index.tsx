import ImageBox from "../ImageBox";
import RunningTime from "../RunningTime";
import Viewer from "../Viewer";

export default function ({
  ipcHref,
  ipcNumber,
  since,
  version,
  gaBeianLogoUrl,
  gaBeianNumber,
  gaBeianUrl,
}: {
  // 公安备案
  gaBeianNumber: string;
  gaBeianUrl: string;
  gaBeianLogoUrl: string;
  // ipc
  ipcNumber: string;
  ipcHref: string;
  since: string;
  version: string;
}) {
  return (
    <>
      <footer className="text-center text-sm space-y-1.5 mt-10 md:mt-14 pb-4 dark:text-dark footer-icp-number" style={{ color: 'var(--text-color-xs, #8e8ea0)' }}>
        {Boolean(ipcNumber) && (
          <p className="">
            ICP 编号:&nbsp;
            <a
              href={ipcHref}
              target="_blank"
              className="hover:text-gray-900 hover:underline-offset-2 hover:underline dark:hover:text-dark-hover transition"
            >
              {ipcNumber}
            </a>
          </p>
        )}
        {Boolean(gaBeianNumber) && (
          <p className="flex justify-center items-center footer-gongan-beian">
            公安备案:&nbsp;
            {Boolean(gaBeianLogoUrl) && (
              <ImageBox
                src={gaBeianLogoUrl}
                lazyLoad={true}
                alt="公安备案 logo"
                width={20}
              />
            )}
            <a
              href={gaBeianUrl}
              target="_blank"
              className="hover:text-gray-900 hover:underline-offset-2 hover:underline dark:hover:text-dark-hover transition"
            >
              {gaBeianNumber}
            </a>
          </p>
        )}
        <RunningTime since={since}></RunningTime>
        <p className="footer-powered-by-bianblog">
          Powered By&nbsp;
          <a
            href="https://github.com/Mereithhh/bianblog"
            target={"_blank"}
            className="hover:text-gray-900 dark:hover:text-dark-hover transition ua ua-link"
          >
            BianBlog <span>{version}</span>
          </a>
        </p>

        <p className="select-none footer-copy-right">
          © {new Date(since).getFullYear()} - {new Date().getFullYear()}
        </p>
        <p className="select-none footer-viewer">
          <Viewer></Viewer>
        </p>
      </footer>
    </>
  );
}
