import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import { CalendarBlank, User, Clock } from 'phosphor-react';

import { getPrismicClient } from '../../services/prismic';

import { formatDate } from '../../utils/masks';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const { isFallback } = useRouter();

  // Reading timing
  const numberWordsInHeading = post?.data?.content?.reduce(
    (acumulator, currentValue) => {
      const formatLength = currentValue.heading.split(' ').length;

      return formatLength + acumulator;
    },
    0
  );

  const numberWordsInBody = post?.data?.content?.reduce(
    (acumulator, currentValue) => {
      const formatLength = RichText.asText(currentValue.body).split(' ').length;

      return formatLength + acumulator;
    },
    0
  );

  const numberTotalWords = numberWordsInHeading + numberWordsInBody;
  const numberOfWordsReadPerMinute = 200;
  const readingTime = Math.ceil(numberTotalWords / numberOfWordsReadPerMinute);

  if (isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <>
      <Head>
        <title>{post?.data?.title} | spacetreveling</title>
      </Head>

      <main className={styles.containerPost}>
        <img src={post?.data?.banner?.url} alt="" />

        <div>
          <h1>{post?.data?.title}</h1>

          <div className={styles.info}>
            <div>
              <CalendarBlank size={20} color="#BBB" />
              <span>{formatDate(post?.first_publication_date)}</span>
            </div>
            <div>
              <User size={20} color="#BBB" />
              <span>{post?.data?.author}</span>
            </div>
            <div>
              <Clock size={20} color="#BBB" />
              <span>{readingTime} min</span>
            </div>
          </div>

          <div className={styles.content}>
            {post?.data?.content?.map(content => (
              <section key={content.heading}>
                <h2>{content.heading}</h2>
                <div
                  dangerouslySetInnerHTML={{
                    __html: RichText.asHtml(content.body),
                  }}
                />
              </section>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.getByType('posts', { pageSize: 5 });

  const paths = posts.results.map(post => ({ params: { slug: post?.uid } }));

  // TODO
  return {
    paths: paths,
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug));

  const post = {
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content.heading,
        body: content.body,
      })),
    },
    uid: response.uid,
    first_publication_date: response.first_publication_date,
  } as Post;

  // TODO
  return {
    props: {
      post: post,
    },
    revalidate: 60 * 60 * 24, // 1 day
  };
};
